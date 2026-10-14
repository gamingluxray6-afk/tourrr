<?php
require __DIR__ . '/config.php';
header('Content-Type: application/json');
if (($_SESSION['user_role'] ?? '') !== 'admin') { echo json_encode(['success' => false, 'message' => 'Admin login required.']); exit; }
try {
    ensure_scan_log($pdo);
    ensure_user_profile_cols($pdo);
    $cols = array_column($pdo->query("SHOW COLUMNS FROM users")->fetchAll(), 'Field');
    $sel = ['u.id', 'u.name', 'u.email', 'u.role', 'u.points'];
    foreach (['phone', 'created_at', 'age', 'gender', 'origin'] as $c) if (in_array($c, $cols, true)) $sel[] = "u.$c";
    $sel[] = "(SELECT COUNT(DISTINCT l.spot_id) FROM scan_log l WHERE l.user_id = u.id) AS checkins";
    $sel[] = "(SELECT MAX(l.scanned_at) FROM scan_log l WHERE l.user_id = u.id) AS last_checkin";
    $users = $pdo->query("SELECT " . implode(', ', $sel) . " FROM users u ORDER BY u.id DESC")->fetchAll();
    echo json_encode(['success' => true, 'users' => $users]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
