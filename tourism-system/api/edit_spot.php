<?php
require __DIR__ . '/config.php';
require __DIR__ . '/image_helper.php';
header('Content-Type: application/json');
require_admin();

try {
    $id = intval($_POST['id'] ?? 0);
    $st = $pdo->prepare("SELECT image_url FROM tourist_spots WHERE id = ?");
    $st->execute([$id]);
    $existing = $st->fetch();
    if (!$existing) { echo json_encode(['success' => false, 'message' => 'Spot not found.']); exit; }
    $image_url = $existing['image_url'];

    $lat = $_POST['lat'] ?? ''; $lng = $_POST['lng'] ?? '';
    try { $ck = $pdo->prepare("SELECT COUNT(*) FROM spot_categories WHERE slug = ?"); $ck->execute([$_POST['category'] ?? '']);
          if (!$ck->fetchColumn()) { echo json_encode(['success' => false, 'message' => 'Please choose a category.']); exit; } } catch (Exception $e) {}
    if (!valid_coords($lat, $lng)) { echo json_encode(['success' => false, 'message' => 'Please pin the spot on the map.']); exit; }

    if (!empty($_POST['image_base64'])) {
        $new = save_image_data($_POST['image_base64']);
        if (!$new) { echo json_encode(['success' => false, 'message' => 'The picture could not be saved. Please choose a JPG, PNG or WebP image.']); exit; }
        delete_old_image($image_url);
        $image_url = $new;
    }

    $stmt = $pdo->prepare("UPDATE tourist_spots SET name=?, category=?, location=?, points_reward=?, image_url=?, description=?, features=?, lat=?, lng=? WHERE id=?");
    $stmt->execute([trim($_POST['name'] ?? ''), $_POST['category'] ?? 'nature', $_POST['location'] ?? '', intval($_POST['points_reward'] ?? 0), $image_url, $_POST['description'] ?? '', $_POST['features'] ?? '', $lat, $lng, $id]);
    $err = save_item_photos($pdo, 'spot', $id);
    admin_log($pdo, 'fa-pen-to-square', 't0', 'Edited the spot <b>' . h(trim($_POST['name'] ?? '')) . '</b>');
    echo json_encode(['success' => true, 'message' => $err ? "Spot updated, but: $err" : 'Spot updated successfully!']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
