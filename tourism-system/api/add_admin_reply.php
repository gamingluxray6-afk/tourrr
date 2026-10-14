<?php
require __DIR__ . '/config.php';
require __DIR__ . '/image_helper.php';
header('Content-Type: application/json');
require_admin();

$review_id = intval($_POST['review_id'] ?? 0);
$admin_reply = trim($_POST['admin_reply'] ?? '');

if ($review_id && $admin_reply !== '') {
    $stmt = $pdo->prepare("UPDATE reviews SET admin_reply = ?, admin_reply_date = NOW() WHERE id = ?");
    if ($stmt->execute([mb_substr($admin_reply, 0, 1000), $review_id])) {
        $r = $pdo->prepare("SELECT r.user_name, COALESCE(s.name, p.name) AS item FROM reviews r LEFT JOIN tourist_spots s ON r.item_type='spot' AND s.id=r.item_id LEFT JOIN products p ON r.item_type='product' AND p.id=r.item_id WHERE r.id = ?");
        $r->execute([$review_id]); $r = $r->fetch();
        if ($r) admin_log($pdo, 'fa-reply', 't3', 'Replied to <b>' . h($r['user_name']) . "</b>'s review of <b>" . h($r['item']) . '</b>');
        echo json_encode(['success' => true, 'message' => 'Reply posted!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to post reply.']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Missing data.']);
}
?>
