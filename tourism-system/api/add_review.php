<?php
require __DIR__ . '/config.php';
header('Content-Type: application/json');

$user_id = intval($_SESSION['user_id'] ?? 0);
if (!$user_id) { echo json_encode(['success' => false, 'message' => 'Please log in to post a review.']); exit; }
$user_name = (string)($_SESSION['user_name'] ?? 'Anonymous');

$item_type = $_POST['item_type'] ?? '';
$item_id = intval($_POST['item_id'] ?? 0);
$rating = intval($_POST['rating'] ?? 0);
$comment = mb_substr(trim($_POST['comment'] ?? ''), 0, 1000);

if (!in_array($item_type, ['spot', 'product'], true) || $item_id < 1) { echo json_encode(['success' => false, 'message' => 'Invalid item.']); exit; }
if ($rating < 1 || $rating > 5) { echo json_encode(['success' => false, 'message' => 'Invalid rating.']); exit; }

$table = ($item_type === 'spot') ? 'tourist_spots' : 'products';
$chk = $pdo->prepare("SELECT id FROM $table WHERE id = ?");
$chk->execute([$item_id]);
if (!$chk->fetch()) { echo json_encode(['success' => false, 'message' => 'That item no longer exists.']); exit; }

ensure_one_review_per_user($pdo);
$find = $pdo->prepare("SELECT id FROM reviews WHERE user_id = ? AND item_type = ? AND item_id = ? ORDER BY id DESC");
$find->execute([$user_id, $item_type, $item_id]);
$ids = $find->fetchAll(PDO::FETCH_COLUMN);

if ($ids) {
    $keep = array_shift($ids);
    $pdo->prepare("UPDATE reviews SET user_name = ?, rating = ?, comment = ?, created_at = NOW() WHERE id = ?")
        ->execute([$user_name, $rating, $comment, $keep]);
    if ($ids) {
        $in = implode(',', array_map('intval', $ids));
        $pdo->exec("DELETE FROM reviews WHERE id IN ($in)");
    }
    $message = 'Your review was updated.';
} else {
    $pdo->prepare("INSERT INTO reviews (user_id, user_name, item_type, item_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)")
        ->execute([$user_id, $user_name, $item_type, $item_id, $rating, $comment]);
    $message = 'Review posted!';
}

refresh_item_rating($pdo, $item_type, $item_id);

echo json_encode(['success' => true, 'message' => $message, 'updated' => $message !== 'Review posted!']);
?>
