<?php
require __DIR__ . '/config.php';
header('Content-Type: application/json');
if (($_SESSION['user_role'] ?? '') !== 'admin') { echo json_encode(['success' => false, 'message' => 'Admin login required.']); exit; }

try {
    ensure_group_visits($pdo);
    $scans = $pdo->query("SELECT l.id, l.user_id, l.spot_id, l.points, l.scanned_at, l.visit_type, l.group_size, t.name, t.category,
                                 u.name AS user_name, u.email AS user_email
                          FROM scan_log l JOIN (" . FIRST_SCANS . ") f ON f.id = l.id
                          JOIN tourist_spots t ON t.id = l.spot_id
                          LEFT JOIN users u ON u.id = l.user_id ORDER BY l.scanned_at ASC")->fetchAll();
    $comp = [];
    foreach ($pdo->query("SELECT scan_id, gender, age FROM scan_companions ORDER BY id") as $c) {
        $comp[$c['scan_id']][] = ['gender' => $c['gender'], 'age' => intval($c['age'])];
    }
    foreach ($scans as &$s) $s['companions'] = $comp[$s['id']] ?? [];
    unset($s);
    $tourists = intval($pdo->query("SELECT COUNT(*) FROM users WHERE role <> 'admin'")->fetchColumn());
    echo json_encode(['success' => true, 'scans' => $scans, 'tourists' => $tourists]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
