<?php
require 'config.php';
header('Content-Type: application/json');

$user_id = $_POST['user_id'] ?? 0;
$user_name = $_POST['user_name'] ?? 'Anonymous';
$item_type = $_POST['item_type'] ?? '';
$item_id = $_POST['item_id'] ?? 0;
$rating = intval($_POST['rating'] ?? 0);
$comment = $_POST['comment'] ?? '';

if ($rating < 1 || $rating > 5) { echo json_encode(['success' => false, 'message' => 'Invalid rating.']); exit; }

$table = ($item_type === 'spot') ? 'tourist_spots' : 'products';

// Insert review
$stmt = $pdo->prepare("INSERT INTO reviews (user_id, user_name, item_type, item_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)");
$stmt->execute([$user_id, $user_name, $item_type, $item_id, $rating, $comment]);

// Calculate new average rating for the item
$stmt = $pdo->prepare("SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE item_type = ? AND item_id = ?");
$stmt->execute([$item_type, $item_id]);
$result = $stmt->fetch();

$newAvg = round($result['avg_rating'], 1);

// Update the main table
$stmt = $pdo->prepare("UPDATE $table SET rating = ? WHERE id = ?");
$stmt->execute([$newAvg, $item_id]);

echo json_encode(['success' => true, 'message' => 'Review posted!']);
?>