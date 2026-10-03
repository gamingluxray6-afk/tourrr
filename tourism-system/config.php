<?php
// config.php
$host = 'localhost';
$dbname = 'tourgo_db';
$username = 'root';
$password = ''; // Default XAMPP password is empty. If you use WAMP/MAMP, change this.

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}

// Start session for keeping track of logged-in user
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>