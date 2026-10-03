<?php
require 'config.php';
header('Content-Type: application/json');

$review_id = $_POST['review_id'] ?? 0;
$admin_reply = $_POST['admin_reply'] ?? '';

if ($review_id && $admin_reply) {
    $stmt = $pdo->prepare("UPDATE reviews SET admin_reply = ?, admin_reply_date = NOW() WHERE id = ?");
    if ($stmt->execute([$admin_reply, $review_id])) {
        echo json_encode(['success' => true, 'message' => 'Reply posted!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to post reply.']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Missing data.']);
}
?>