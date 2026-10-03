<?php
require 'config.php';
header('Content-Type: application/json');

$type = $_GET['type'] ?? '';

if ($type === 'spots') {
    $stmt = $pdo->query("SELECT s.*, COUNT(r.id) as review_count FROM tourist_spots s LEFT JOIN reviews r ON s.id = r.item_id AND r.item_type = 'spot' GROUP BY s.id ORDER BY s.id ASC");
    echo json_encode($stmt->fetchAll());
} 
elseif ($type === 'products') {
    $stmt = $pdo->query("SELECT p.*, COUNT(r.id) as review_count FROM products p LEFT JOIN reviews r ON p.id = r.item_id AND r.item_type = 'product' GROUP BY p.id ORDER BY p.id ASC");
    echo json_encode($stmt->fetchAll());
} 
elseif ($type === 'records') {
    $stmt = $pdo->query("SELECT * FROM records ORDER BY id ASC");
    echo json_encode($stmt->fetchAll());
}
elseif ($type === 'ticket_items') {
    $stmt = $pdo->query("SELECT * FROM ticket_items ORDER BY id ASC");
    echo json_encode($stmt->fetchAll());
}
elseif ($type === 'reviews') {
    $item_type = $_GET['item_type'] ?? '';
    $item_id = $_GET['item_id'] ?? 0;
    $stmt = $pdo->prepare("SELECT * FROM reviews WHERE item_type = ? AND item_id = ? ORDER BY created_at DESC");
    $stmt->execute([$item_type, $item_id]);
    echo json_encode($stmt->fetchAll());
}
elseif ($type === 'all_reviews') {
    // Fetch all reviews for Admin
    $stmt = $pdo->query("SELECT * FROM reviews ORDER BY created_at DESC");
    echo json_encode($stmt->fetchAll());
}
else { echo json_encode(['error' => 'Invalid request']); }
?>