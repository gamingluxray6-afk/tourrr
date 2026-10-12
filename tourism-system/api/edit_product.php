<?php
require __DIR__ . '/config.php';
require __DIR__ . '/image_helper.php';
header('Content-Type: application/json');
require_admin();

try {
    ensure_product_coords($pdo);
    $id = intval($_POST['id'] ?? 0);
    $st = $pdo->prepare("SELECT image_url FROM products WHERE id = ?");
    $st->execute([$id]);
    $existing = $st->fetch();
    if (!$existing) { echo json_encode(['success' => false, 'message' => 'Product not found.']); exit; }
    $image_url = $existing['image_url'];

    $lat = $_POST['lat'] ?? ''; $lng = $_POST['lng'] ?? '';
    if (!valid_coords($lat, $lng)) { echo json_encode(['success' => false, 'message' => 'Please pin where to buy this product on the map.']); exit; }

    if (!empty($_POST['image_base64'])) {
        $new = save_image_data($_POST['image_base64']);
        if (!$new) { echo json_encode(['success' => false, 'message' => 'The picture could not be saved. Please choose a JPG, PNG or WebP image.']); exit; }
        delete_old_image($image_url);
        $image_url = $new;
    }

    $stmt = $pdo->prepare("UPDATE products SET name=?, category=?, location=?, price=?, image_url=?, description=?, features=?, lat=?, lng=? WHERE id=?");
    $stmt->execute([trim($_POST['name'] ?? ''), $_POST['category'] ?? 'food', trim($_POST['location'] ?? ''), floatval($_POST['price'] ?? 0), $image_url, $_POST['description'] ?? '', $_POST['features'] ?? '', $lat, $lng, $id]);
    $err = save_item_photos($pdo, 'product', $id);
    admin_log($pdo, 'fa-pen-to-square', 't1', 'Edited the product <b>' . h(trim($_POST['name'] ?? '')) . '</b>');
    echo json_encode(['success' => true, 'message' => $err ? "Product updated, but: $err" : 'Product updated successfully!']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
