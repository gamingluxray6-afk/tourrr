<?php
require __DIR__ . '/config.php';
require __DIR__ . '/image_helper.php';
header('Content-Type: application/json');
require_admin();

try {
    $name = trim($_POST['name'] ?? '');
    $lat = $_POST['lat'] ?? ''; $lng = $_POST['lng'] ?? '';
    try { $ck = $pdo->prepare("SELECT COUNT(*) FROM spot_categories WHERE slug = ?"); $ck->execute([$_POST['category'] ?? '']);
          if (!$ck->fetchColumn()) { echo json_encode(['success' => false, 'message' => 'Please choose a category.']); exit; } } catch (Exception $e) {}
    if ($name === '') { echo json_encode(['success' => false, 'message' => 'Please enter the spot name.']); exit; }
    if (!valid_coords($lat, $lng)) { echo json_encode(['success' => false, 'message' => 'Please pin the spot on the map first.']); exit; }

    $image_url = save_image_data($_POST['image_base64'] ?? '');
    if (!$image_url) { echo json_encode(['success' => false, 'message' => 'The picture could not be saved. Please choose a JPG, PNG or WebP image.']); exit; }

    $stmt = $pdo->prepare("INSERT INTO tourist_spots (name, category, location, rating, points_reward, image_url, description, features, lat, lng) VALUES (?,?,?,?,?,?,?,?,?,?)");
    $stmt->execute([$name, $_POST['category'] ?? 'nature', $_POST['location'] ?? '', 0, intval($_POST['points_reward'] ?? 0), $image_url, $_POST['description'] ?? '', $_POST['features'] ?? '', $lat, $lng]);
    $err = save_item_photos($pdo, 'spot', intval($pdo->lastInsertId()));
    admin_log($pdo, 'fa-map-location-dot', 't0', 'Added the spot <b>' . h($name) . '</b>');
    echo json_encode(['success' => true, 'message' => $err ? "Spot added, but: $err" : 'Spot added!']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
