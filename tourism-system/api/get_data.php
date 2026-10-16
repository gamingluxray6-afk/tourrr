<?php
require __DIR__ . '/config.php';
require __DIR__ . '/image_helper.php';
header('Content-Type: application/json');

$type = $_GET['type'] ?? '';
if (in_array($type, ['spots', 'products', 'reviews', 'all_reviews'], true)) ensure_one_review_per_user($pdo);

if ($type === 'spots') {
    $stmt = $pdo->query("SELECT s.*, COUNT(r.id) as review_count FROM tourist_spots s LEFT JOIN reviews r ON s.id = r.item_id AND r.item_type = 'spot' GROUP BY s.id ORDER BY s.id ASC");
    echo json_encode(attach_item_photos($pdo, $stmt->fetchAll(), 'spot'));
} 
elseif ($type === 'products') {
    ensure_product_coords($pdo);
    $stmt = $pdo->query("SELECT p.*, COUNT(r.id) as review_count FROM products p LEFT JOIN reviews r ON p.id = r.item_id AND r.item_type = 'product' GROUP BY p.id ORDER BY p.id ASC");
    echo json_encode(attach_item_photos($pdo, $stmt->fetchAll(), 'product'));
} 
elseif ($type === 'records') {
    $stmt = $pdo->query("SELECT * FROM records ORDER BY id ASC");
    echo json_encode($stmt->fetchAll());
}
elseif ($type === 'ticket_items') {
    echo json_encode(ticket_items_list($pdo));
}
elseif ($type === 'reviews') {
    $item_type = $_GET['item_type'] ?? '';
    $item_id = $_GET['item_id'] ?? 0;
    $stmt = $pdo->prepare("SELECT * FROM reviews WHERE item_type = ? AND item_id = ? ORDER BY created_at DESC");
    $stmt->execute([$item_type, $item_id]);
    echo json_encode($stmt->fetchAll());
}
elseif ($type === 'all_reviews') {
    $stmt = $pdo->query("SELECT * FROM reviews ORDER BY created_at DESC");
    echo json_encode($stmt->fetchAll());
}
elseif ($type === 'stats') {
    ensure_scan_log($pdo);
    echo json_encode([
        'visitors' => intval($pdo->query("SELECT COALESCE(SUM(visitors),0) FROM records")->fetchColumn()),
        'checkins' => intval($pdo->query("SELECT COUNT(*) FROM (" . FIRST_SCANS . ") f")->fetchColumn()),
        'points'   => intval($pdo->query("SELECT COALESCE(SUM(points),0) FROM scan_log")->fetchColumn()),
    ]);
}
else { echo json_encode(['error' => 'Invalid request']); }
?>