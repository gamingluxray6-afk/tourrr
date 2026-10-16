<?php
require __DIR__ . '/config.php';
header('Content-Type: application/json');

$pdo->exec("CREATE TABLE IF NOT EXISTS spot_scans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    spot_id INT NOT NULL,
    points INT NOT NULL DEFAULT 0,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_spot (user_id, spot_id)
)");

$uid = intval($_SESSION['user_id'] ?? 0);
if (!$uid) { echo json_encode(['success' => false, 'message' => 'Please log in first.']); exit; }

$action = $_POST['action'] ?? $_GET['action'] ?? 'scan';

try {
    if ($action === 'history') {
        $st = $pdo->prepare("SELECT s.id, s.spot_id, s.points, s.scanned_at, t.name
                             FROM spot_scans s JOIN tourist_spots t ON t.id = s.spot_id
                             WHERE s.user_id = ? ORDER BY s.scanned_at DESC");
        $st->execute([$uid]);
        $pts = $pdo->prepare("SELECT points FROM users WHERE id = ?"); $pts->execute([$uid]);
        echo json_encode(['success' => true, 'visits' => $st->fetchAll(), 'points' => intval($pts->fetchColumn())]);
        exit;
    }

    $spotId = intval($_POST['spot_id'] ?? 0);
    $token  = trim($_POST['token'] ?? '');
    $st = $pdo->prepare("SELECT id, name, points_reward FROM tourist_spots WHERE id = ?");
    $st->execute([$spotId]);
    $spot = $st->fetch();
    if (!$spot) { echo json_encode(['success' => false, 'message' => 'Spot not found.']); exit; }

    if (($_SESSION['user_role'] ?? '') === 'admin') {
        echo json_encode(['success' => false, 'message' => 'Admin accounts do not earn points. Log in as a tourist to test.']); exit;
    }

    $pdo->exec("CREATE TABLE IF NOT EXISTS spot_qr (spot_id INT PRIMARY KEY, token VARCHAR(32) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, regenerated_at TIMESTAMP NULL DEFAULT NULL)");
    $q = $pdo->prepare("SELECT token FROM spot_qr WHERE spot_id = ?"); $q->execute([$spotId]);
    $real = $q->fetchColumn();
    if (!$real || $token === '' || !hash_equals($real, $token)) {
        echo json_encode(['success' => false, 'message' => 'This QR code is not valid or was replaced. Ask the tourism office for the current QR.']); exit;
    }

    if ($action === 'check') {
        $a = $pdo->prepare("SELECT COUNT(*) FROM spot_scans WHERE user_id = ? AND spot_id = ?"); $a->execute([$uid, $spotId]);
        echo json_encode(['success' => true, 'already' => intval($a->fetchColumn()) > 0, 'spot_name' => $spot['name'], 'points' => intval($spot['points_reward'])]);
        exit;
    }

    $visitType = ($_POST['visit_type'] ?? 'solo') === 'group' ? 'group' : 'solo';
    $companions = [];
    if ($visitType === 'group') {
        $list = json_decode($_POST['companions'] ?? '[]', true);
        if (!is_array($list) || count($list) < 1 || count($list) > 50) {
            echo json_encode(['success' => false, 'message' => 'Add between 1 and 50 people in your group.']); exit;
        }
        foreach ($list as $c) {
            $g = $c['gender'] ?? '';
            $age = filter_var($c['age'] ?? null, FILTER_VALIDATE_INT);
            if (!in_array($g, ['male', 'female', 'other'], true) || $age === false || $age < 0 || $age > 120) {
                echo json_encode(['success' => false, 'message' => 'Please give a gender and an age (0-120) for every person.']); exit;
            }
            $companions[] = [$g, $age];
        }
    }
    $groupSize = 1 + count($companions);

    $reward = intval($spot['points_reward']);
    ensure_group_visits($pdo);
    $pdo->beginTransaction();
    $ins = $pdo->prepare("INSERT IGNORE INTO spot_scans (user_id, spot_id, points) VALUES (?, ?, ?)");
    $ins->execute([$uid, $spotId, $reward]);
    $isNew = $ins->rowCount() > 0;
    if ($isNew) {
        $pdo->prepare("UPDATE users SET points = points + ? WHERE id = ?")->execute([$reward, $uid]);
    }

    $counted = false;
    if ($isNew) {
        $counted = true;
        $pdo->prepare("INSERT INTO scan_log (user_id, spot_id, points, visit_type, group_size) VALUES (?, ?, ?, ?, ?)")
            ->execute([$uid, $spotId, $isNew ? $reward : 0, $visitType, $groupSize]);
        $scanId = $pdo->lastInsertId();
        $cp = $pdo->prepare("INSERT INTO scan_companions (scan_id, gender, age) VALUES (?, ?, ?)");
        foreach ($companions as [$g, $age]) $cp->execute([$scanId, $g, $age]);
        $up = $pdo->prepare("UPDATE records SET visitors = visitors + ? WHERE location = ? AND record_date = CURDATE() ORDER BY id LIMIT 1");
        $up->execute([$groupSize, $spot['name']]);
        if ($up->rowCount() === 0) {
            $pdo->prepare("INSERT INTO records (location, visitors, record_date) VALUES (?, ?, CURDATE())")->execute([$spot['name'], $groupSize]);
        }
    }
    $pts = $pdo->prepare("SELECT points FROM users WHERE id = ?"); $pts->execute([$uid]);
    $total = intval($pts->fetchColumn());
    $pdo->commit();

    echo json_encode([
        'success' => true, 'already' => !$isNew, 'awarded' => $isNew ? $reward : 0,
        'total' => $total, 'spot_name' => $spot['name'], 'spot_id' => $spotId,
        'visit_type' => $visitType, 'group_size' => $groupSize, 'counted' => $counted,
        'message' => $isNew ? 'Points earned!' : 'You already checked in here before.'
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
