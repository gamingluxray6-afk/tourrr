<?php
require 'config.php';
header('Content-Type: application/json');

try {
    $name = $_POST['name'] ?? '';
    $category = $_POST['category'] ?? '';
    $location = $_POST['location'] ?? '';
    $rating = $_POST['rating'] ?? 0;
    $points_reward = $_POST['points_reward'] ?? 0;
    $description = $_POST['description'] ?? '';
    $features = $_POST['features'] ?? '';
    $lat = $_POST['lat'] ?? 16.4080;
    $lng = $_POST['lng'] ?? 120.5000;
    
    // Handle image - accept base64
    $image_url = '';
    if (isset($_POST['image_base64']) && !empty($_POST['image_base64'])) {
        $image_url = $_POST['image_base64'];
    }

    $stmt = $pdo->prepare("INSERT INTO tourist_spots (name, category, location, rating, points_reward, image_url, description, features, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    if ($stmt->execute([$name, $category, $location, $rating, $points_reward, $image_url, $description, $features, $lat, $lng])) {
        echo json_encode(['success' => true, 'message' => 'Tourist Spot added successfully!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to add spot.']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
?>