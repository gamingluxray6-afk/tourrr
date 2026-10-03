<?php
require 'config.php';
header('Content-Type: application/json');

try {
    $id = $_POST['id'] ?? '';
    $name = $_POST['name'] ?? '';
    $category = $_POST['category'] ?? '';
    $location = $_POST['location'] ?? '';
    $rating = $_POST['rating'] ?? 0;
    $points_reward = $_POST['points_reward'] ?? 0;
    $description = $_POST['description'] ?? '';
    $features = $_POST['features'] ?? '';
    $lat = $_POST['lat'] ?? 16.4080;
    $lng = $_POST['lng'] ?? 120.5000;
    
    // Handle image - if new image uploaded, use it; otherwise keep existing
    $image_url = '';
    if (isset($_POST['image_base64']) && !empty($_POST['image_base64'])) {
        $image_url = $_POST['image_base64'];
    } else {
        // Keep existing image
        $stmt = $pdo->prepare("SELECT image_url FROM tourist_spots WHERE id = ?");
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        $image_url = $existing['image_url'] ?? '';
    }

    $stmt = $pdo->prepare("UPDATE tourist_spots SET name=?, category=?, location=?, rating=?, points_reward=?, image_url=?, description=?, features=?, lat=?, lng=? WHERE id=?");
    
    if ($stmt->execute([$name, $category, $location, $rating, $points_reward, $image_url, $description, $features, $lat, $lng, $id])) {
        echo json_encode(['success' => true, 'message' => 'Spot updated successfully!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update spot.']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
?>