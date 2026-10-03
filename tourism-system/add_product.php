<?php
require 'config.php';
header('Content-Type: application/json');

try {
    $name = $_POST['name'] ?? '';
    $category = $_POST['category'] ?? '';
    $location = $_POST['location'] ?? '';
    $price = $_POST['price'] ?? 0;
    $rating = $_POST['rating'] ?? 0;
    $description = $_POST['description'] ?? '';
    $features = $_POST['features'] ?? '';
    
    // Handle image - accept base64
    $image_url = '';
    if (isset($_POST['image_base64']) && !empty($_POST['image_base64'])) {
        $image_url = $_POST['image_base64'];
    }

    $stmt = $pdo->prepare("INSERT INTO products (name, category, location, price, rating, image_url, description, features) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    
    if ($stmt->execute([$name, $category, $location, $price, $rating, $image_url, $description, $features])) {
        echo json_encode(['success' => true, 'message' => 'Product added successfully!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to add product.']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
?>