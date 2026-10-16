<?php
require __DIR__ . '/config.php';
header('Content-Type: application/json');
$uid = intval($_SESSION['user_id'] ?? 0);
if (!$uid) { echo json_encode(['success' => false]); exit; }
$st = $pdo->prepare("SELECT * FROM users WHERE id = ?");
$st->execute([$uid]);
$u = $st->fetch();
if (!$u) { echo json_encode(['success' => false]); exit; }
unset($u['password']);
echo json_encode(['success' => true, 'user' => $u]);
