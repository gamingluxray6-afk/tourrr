<?php
require __DIR__ . '/config.php';
require __DIR__ . '/image_helper.php';
header('Content-Type: application/json');

$user_id = intval($_SESSION['user_id'] ?? 0);
if (!$user_id) { echo json_encode(['success' => false, 'message' => 'Please log in first.']); exit; }

try {
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $phone = $_POST['phone'] ?? '';
    $password = $_POST['password'] ?? '';
    $age = trim($_POST['age'] ?? '');
    $gender = $_POST['gender'] ?? '';
    $origin = mb_substr(trim($_POST['origin'] ?? ''), 0, 120);

    if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Please enter your name and a valid email.']); exit;
    }
    if ($age !== '' && (!ctype_digit($age) || $age < 1 || $age > 120)) {
        echo json_encode(['success' => false, 'message' => 'Please enter an age from 1 to 120.']); exit;
    }
    if ($gender !== '' && !in_array($gender, ['male', 'female', 'other', 'prefer_not'], true)) {
        echo json_encode(['success' => false, 'message' => 'Please choose a gender.']); exit;
    }
    $dup = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id <> ?");
    $dup->execute([$email, $user_id]);
    if ($dup->fetch()) { echo json_encode(['success' => false, 'message' => 'That email is already used.']); exit; }

    ensure_user_profile_cols($pdo);
    $sets = ['name = ?', 'email = ?', 'phone = ?', 'age = ?', 'gender = ?', 'origin = ?'];
    $vals = [$name, $email, $phone, $age === '' ? null : intval($age), $gender === '' ? null : $gender, $origin === '' ? null : $origin];

    if (!empty($_POST['profile_image'])) {
        $url = save_image_data($_POST['profile_image']);
        if (!$url) { echo json_encode(['success' => false, 'message' => 'The profile picture could not be saved. Please use a JPG, PNG or WebP image.']); exit; }
        $old = $pdo->prepare("SELECT profile_image FROM users WHERE id = ?"); $old->execute([$user_id]);
        delete_old_image($old->fetchColumn());
        $sets[] = 'profile_image = ?'; $vals[] = $url;
    }
    if ($password) {
        if (strlen($password) < 6) { echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters.']); exit; }
        try { $pdo->exec("ALTER TABLE users MODIFY password VARCHAR(255) NOT NULL"); } catch (Exception $e) {}
        $sets[] = 'password = ?'; $vals[] = password_hash($password, PASSWORD_DEFAULT);
    }
    $vals[] = $user_id;
    $pdo->prepare("UPDATE users SET " . implode(', ', $sets) . " WHERE id = ?")->execute($vals);

    $_SESSION['user_name'] = $name;
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();

    unset($user['password']);
    echo json_encode(['success' => true, 'message' => 'Profile updated!', 'user' => $user]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
