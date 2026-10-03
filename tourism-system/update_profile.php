<?php
require 'config.php';
header('Content-Type: application/json');

try {
    $user_id = $_POST['user_id'] ?? 0;
    $name = $_POST['name'] ?? '';
    $email = $_POST['email'] ?? '';
    $phone = $_POST['phone'] ?? '';
    $password = $_POST['password'] ?? '';
    $profile_image = $_POST['profile_image'] ?? '';

    if ($password) {
        $stmt = $pdo->prepare("UPDATE users SET name=?, email=?, phone=?, password=?, profile_image=? WHERE id=?");
        $stmt->execute([$name, $email, $phone, $password, $profile_image, $user_id]);
    } else {
        $stmt = $pdo->prepare("UPDATE users SET name=?, email=?, phone=?, profile_image=? WHERE id=?");
        $stmt->execute([$name, $email, $phone, $profile_image, $user_id]);
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();

    echo json_encode(['success' => true, 'message' => 'Profile updated!', 'user' => $user]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
?>