<?php
require __DIR__ . '/config.php';
header('Content-Type: application/json');

$uid = intval($_SESSION['user_id'] ?? 0);
if (!$uid) { echo json_encode(['success' => false, 'message' => 'Please log in first.']); exit; }
$isAdmin = ($_SESSION['user_role'] ?? '') === 'admin';

function ensure_redeemed($pdo) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS redeemed_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(16) NOT NULL UNIQUE,
        token VARCHAR(32) NOT NULL,
        user_id INT NOT NULL,
        kind VARCHAR(10) NOT NULL,
        item_ref VARCHAR(40) NOT NULL,
        item_name VARCHAR(120) NOT NULL,
        item_icon VARCHAR(50) NOT NULL DEFAULT 'fa-ticket',
        points INT NOT NULL DEFAULT 0,
        status VARCHAR(10) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used_at DATETIME NULL,
        used_by INT NULL,
        KEY idx_user (user_id)
    )");
}

function ticket_out($r, $withHolder = false) {
    $out = [
        'id' => intval($r['id']), 'code' => $r['code'], 'kind' => $r['kind'], 'name' => $r['item_name'], 'icon' => $r['item_icon'],
        'points' => intval($r['points']), 'status' => $r['status'], 'created_at' => $r['created_at'], 'used_at' => $r['used_at'],
        'qr' => app_base_url() . '/index.html?ticket=' . $r['code'] . '-' . $r['token'],
    ];
    if ($withHolder) {
        $out['holder_name'] = $r['holder_name'] ?? null; $out['holder_email'] = $r['holder_email'] ?? null;
        $out['used_by_name'] = $r['used_by_name'] ?? null;
    }
    return $out;
}

function find_ticket($pdo) {
    $code = strtoupper(trim($_POST['code'] ?? ''));
    $token = strtolower(trim($_POST['token'] ?? ''));
    if (!preg_match('/^[A-Z0-9]{6,16}$/', $code) || !preg_match('/^[a-f0-9]{8,32}$/', $token)) return null;
    $st = $pdo->prepare("SELECT r.*, u.name AS holder_name, u.email AS holder_email, a.name AS used_by_name
                         FROM redeemed_items r LEFT JOIN users u ON u.id = r.user_id LEFT JOIN users a ON a.id = r.used_by
                         WHERE r.code = ?");
    $st->execute([$code]);
    $r = $st->fetch();
    return ($r && hash_equals($r['token'], $token)) ? $r : null;
}

try {
    ensure_redeemed($pdo);
    $action = $_POST['action'] ?? $_GET['action'] ?? 'redeem';

    if ($action === 'mine') {
        $st = $pdo->prepare("SELECT * FROM redeemed_items WHERE user_id = ? ORDER BY id DESC");
        $st->execute([$uid]);
        echo json_encode(['success' => true, 'tickets' => array_map('ticket_out', $st->fetchAll())]);
        exit;
    }

    if ($action === 'verify' || $action === 'claim') {
        if (!$isAdmin) { echo json_encode(['success' => false, 'message' => 'Only the tourism office (admin) can check tickets.']); exit; }
        $r = find_ticket($pdo);
        if (!$r) { echo json_encode(['success' => false, 'found' => false, 'message' => 'This ticket does not exist or the QR code was changed.']); exit; }
        if ($action === 'claim') {
            $up = $pdo->prepare("UPDATE redeemed_items SET status = 'used', used_at = NOW(), used_by = ? WHERE id = ? AND status = 'active'");
            $up->execute([$uid, $r['id']]);
            $claimedNow = $up->rowCount() > 0;
            if ($claimedNow) admin_log($pdo, 'fa-hand-holding-heart', 't4', 'Gave <b>' . h($r['item_name']) . '</b> to <b>' . h($r['holder_name'] ?: 'a tourist') . '</b> (ticket ' . h($r['code']) . ')');
            $r = find_ticket($pdo);
            echo json_encode(['success' => true, 'found' => true, 'claimed_now' => $claimedNow, 'ticket' => ticket_out($r, true)]);
            exit;
        }
        echo json_encode(['success' => true, 'found' => true, 'ticket' => ticket_out($r, true)]);
        exit;
    }

    if ($isAdmin) { echo json_encode(['success' => false, 'message' => 'Admin accounts cannot redeem. Log in as a tourist.']); exit; }
    ensure_ticket_items($pdo);
    $type = ($_POST['type'] ?? 'ticket') === 'reward' ? 'reward' : 'ticket';
    $id = intval($_POST['id'] ?? 0);
    if (!$id && $type === 'reward') {
        $k = $pdo->prepare("SELECT id FROM ticket_items WHERE old_key = ?"); $k->execute([$_POST['key'] ?? '']); $id = intval($k->fetchColumn());
    }

    $pdo->beginTransaction();
    $st = $pdo->prepare("SELECT id, name, cost, icon, kind, slots, old_key FROM ticket_items WHERE id = ? AND kind = ? FOR UPDATE");
    $st->execute([$id, $type]);
    $item = $st->fetch();
    if (!$item) { $pdo->rollBack(); echo json_encode(['success' => false, 'message' => 'This item is no longer available.']); exit; }
    $ref = (string)$item['id']; $name = $item['name']; $cost = intval($item['cost']); $icon = $item['icon'] ?: 'fa-ticket';
    if ($item['slots'] !== null) {
        $c = $pdo->prepare("SELECT COUNT(*) FROM redeemed_items WHERE kind = ? AND (item_ref = ? OR (? <> '' AND item_ref = ?))");
        $c->execute([$type, $ref, (string)$item['old_key'], (string)$item['old_key']]);
        if (intval($c->fetchColumn()) >= intval($item['slots'])) { $pdo->rollBack(); echo json_encode(['success' => false, 'message' => "Sorry, \"$name\" is sold out. No slots left.", 'sold_out' => true]); exit; }
    }
    $up = $pdo->prepare("UPDATE users SET points = points - ? WHERE id = ? AND points >= ?");
    $up->execute([$cost, $uid, $cost]);
    if ($up->rowCount() === 0) {
        $pdo->rollBack();
        $pts = $pdo->prepare("SELECT points FROM users WHERE id = ?"); $pts->execute([$uid]);
        echo json_encode(['success' => false, 'message' => 'Not enough points.', 'total' => intval($pts->fetchColumn())]);
        exit;
    }
    $prefix = $type === 'ticket' ? 'TKT' : 'RWD';
    $ins = $pdo->prepare("INSERT INTO redeemed_items (code, token, user_id, kind, item_ref, item_name, item_icon, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    for ($try = 0; ; $try++) {
        $code = $prefix . strtoupper(substr(str_replace(['0', 'O', '1', 'I'], '', bin2hex(random_bytes(8))), 0, 7));
        try { $ins->execute([$code, bin2hex(random_bytes(12)), $uid, $type, $ref, $name, $icon, $cost]); break; }
        catch (PDOException $e) { if ($try > 4) throw $e; }
    }
    $id = $pdo->lastInsertId();
    $pts = $pdo->prepare("SELECT points FROM users WHERE id = ?"); $pts->execute([$uid]);
    $total = intval($pts->fetchColumn());
    $pdo->commit();

    $st = $pdo->prepare("SELECT * FROM redeemed_items WHERE id = ?"); $st->execute([$id]);
    echo json_encode(['success' => true, 'total' => $total, 'ticket' => ticket_out($st->fetch())]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
