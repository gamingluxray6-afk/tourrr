<?php
require __DIR__ . '/config.php';
header('Content-Type: application/json');

if (($_SESSION['user_role'] ?? '') !== 'admin') { echo json_encode(['success' => false, 'message' => 'Admin login required.']); exit; }

$pdo->exec("CREATE TABLE IF NOT EXISTS spot_qr (
    spot_id INT PRIMARY KEY,
    token VARCHAR(32) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    regenerated_at TIMESTAMP NULL DEFAULT NULL
)");

$action = $_POST['action'] ?? $_GET['action'] ?? 'get';
$spotId = intval($_POST['spot_id'] ?? $_GET['spot_id'] ?? 0);

try {
    $st = $pdo->prepare("SELECT id FROM tourist_spots WHERE id = ?");
    $st->execute([$spotId]);
    if (!$st->fetch()) { echo json_encode(['success' => false, 'message' => 'Spot not found.']); exit; }

    $q = $pdo->prepare("SELECT token FROM spot_qr WHERE spot_id = ?");
    $q->execute([$spotId]);
    $token = $q->fetchColumn();

    if ($action === 'regenerate' || !$token) {
        $token = bin2hex(random_bytes(6));
        $pdo->prepare("INSERT INTO spot_qr (spot_id, token) VALUES (?, ?)
                       ON DUPLICATE KEY UPDATE token = VALUES(token), regenerated_at = NOW()")->execute([$spotId, $token]);
        if ($action === 'regenerate') { $n = $pdo->prepare("SELECT name FROM tourist_spots WHERE id = ?"); $n->execute([$spotId]); admin_log($pdo, 'fa-qrcode', 't6', 'Made a new QR code for <b>' . h($n->fetchColumn()) . '</b>'); }
    }
    echo json_encode(['success' => true, 'spot_id' => $spotId, 'token' => $token, 'qr_data' => app_base_url() . "/index.html?scan=$spotId-$token", 'regenerated' => $action === 'regenerate']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
