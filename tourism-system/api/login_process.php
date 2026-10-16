<?php
require __DIR__ . '/config.php';

header('Content-Type: application/json');

function ensure_password_column($pdo) {
    try { $pdo->exec("ALTER TABLE users MODIFY password VARCHAR(255) NOT NULL"); } catch (Exception $e) {}
}
function is_hash($s) { return (bool)preg_match('/^\$2[ayb]\$/', (string)$s); }

$action = $_POST['action'] ?? '';

if ($action === 'login') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    $ok = false;
    if ($user) {
        $stored = (string)$user['password'];
        if (is_hash($stored)) {
            $ok = password_verify($password, $stored);
        } elseif ($stored !== '' && hash_equals($stored, $password)) {
            $ok = true;
            try {
                ensure_password_column($pdo);
                $pdo->prepare("UPDATE users SET password = ? WHERE id = ?")->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
            } catch (Exception $e) {}
        }
    }

    if ($ok) {
        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_name'] = $user['name'];
        $_SESSION['user_role'] = $user['role'];

        unset($user['password']);
        echo json_encode(['success' => true, 'user' => $user]);
    } else {
        usleep(400000);
        echo json_encode(['success' => false, 'message' => 'Invalid email or password.']);
    }
}
elseif ($action === 'signup') {
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $age = filter_var($_POST['age'] ?? null, FILTER_VALIDATE_INT);
    $gender = $_POST['gender'] ?? '';
    $origin = mb_substr(trim($_POST['origin'] ?? ''), 0, 120);

    if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Please enter your name and a valid email.']); exit;
    }
    if ($age === false || $age < 1 || $age > 120) {
        echo json_encode(['success' => false, 'message' => 'Please enter your age (1-120).']); exit;
    }
    if (!in_array($gender, ['male', 'female', 'other', 'prefer_not'], true)) {
        echo json_encode(['success' => false, 'message' => 'Please choose your gender.']); exit;
    }
    if ($origin === '') {
        echo json_encode(['success' => false, 'message' => 'Please enter where you are from.']); exit;
    }
    if (strlen($password) < 6) {
        echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters.']); exit;
    }

    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Email already registered.']);
        exit;
    }

    ensure_password_column($pdo);
    ensure_user_profile_cols($pdo);
    $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, points, age, gender, origin) VALUES (?, ?, ?, 'tourist', 0, ?, ?, ?)");
    if ($stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT), $age, $gender, $origin])) {
        $st = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $st->execute([$pdo->lastInsertId()]);
        $user = $st->fetch();
        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_name'] = $user['name'];
        $_SESSION['user_role'] = $user['role'];
        unset($user['password']);
        echo json_encode(['success' => true, 'message' => 'Account created!', 'user' => $user]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Signup failed.']);
    }
}
