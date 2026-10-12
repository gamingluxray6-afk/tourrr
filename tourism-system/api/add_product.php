<?php
require __DIR__ . '/config.php';
require __DIR__ . '/image_helper.php';
header('Content-Type: application/json');
require_admin();

try {
    ensure_product_coords($pdo);
    $name = trim($_POST['name'] ?? '');
    $lat = $_POST['lat'] ?? ''; $lng = $_POST['lng'] ?? '';
    if ($name === '') { echo json_encode(['success' => false, 'message' => 'Please enter the product name.']); exit; }
    if (!valid_coords($lat, $lng)) { echo json_encode(['success' => false, 'message' => 'Please pin where to buy this product on the map.']); exit; }

    $image_url = save_image_data($_POST['image_base64'] ?? '');
    if (!$image_url) { echo json_encode(['success' => false, 'message' => 'The picture could not be saved. Please choose a JPG, PNG or WebP image.']); exit; }

    $stmt = $pdo->prepare("INSERT INTO products (name, category, location, price, rating, image_url, description, features, lat, lng) VALUES (?,?,?,?,?,?,?,?,?,?)");
    $stmt->execute([$name, $_POST['category'] ?? 'food', trim($_POST['location'] ?? ''), floatval($_POST['price'] ?? 0), 0, $image_url, $_POST['description'] ?? '', $_POST['features'] ?? '', $lat, $lng]);
    $err = save_item_photos($pdo, 'product', intval($pdo->lastInsertId()));
    admin_log($pdo, 'fa-bag-shopping', 't1', 'Added the product <b>' . h($name) . '</b> to <b>' . h(trim($_POST['location'] ?? '')) . '</b>');
    echo json_encode(['success' => true, 'message' => $err ? "Product added, but: $err" : 'Product added!']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
