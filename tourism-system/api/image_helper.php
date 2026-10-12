<?php
const SITE_ROOT = __DIR__ . '/..';

function save_image_data($dataUrl, $dir = 'uploads') {
    if (!is_string($dataUrl) || !preg_match('#^data:image/(jpeg|jpg|png|webp|gif);base64,#i', $dataUrl)) return null;
    $bin = base64_decode(substr($dataUrl, strpos($dataUrl, ',') + 1), true);
    if ($bin === false || strlen($bin) > 8 * 1024 * 1024) return null;
    $info = @getimagesizefromstring($bin);
    if (!$info) return null;
    $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'][$info['mime']] ?? null;
    if (!$ext) return null;
    $folder = SITE_ROOT . '/' . $dir;
    if (!is_dir($folder) && !@mkdir($folder, 0775, true)) return null;
    $name = bin2hex(random_bytes(8)) . '.' . $ext;
    if (@file_put_contents($folder . '/' . $name, $bin) === false) return null;
    return $dir . '/' . $name;
}

function delete_old_image($url) {
    if (is_string($url) && preg_match('#^uploads/[a-f0-9]+\.(jpg|png|webp|gif)$#', $url)) {
        $f = SITE_ROOT . '/' . $url;
        if (is_file($f)) @unlink($f);
    }
}

const MAX_EXTRA_PHOTOS = 10;
function ensure_item_photos($pdo) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS item_photos (
        id INT AUTO_INCREMENT PRIMARY KEY, item_type VARCHAR(10) NOT NULL, item_id INT NOT NULL,
        image_url VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_item (item_type, item_id)
    )");
}

function save_item_photos($pdo, $type, $id) {
    ensure_item_photos($pdo);
    $remove = array_filter(array_map('intval', explode(',', $_POST['remove_photos'] ?? '')));
    if ($remove) {
        $in = implode(',', $remove);
        $st = $pdo->prepare("SELECT id, image_url FROM item_photos WHERE item_type = ? AND item_id = ? AND id IN ($in)");
        $st->execute([$type, $id]);
        foreach ($st->fetchAll() as $p) delete_old_image($p['image_url']);
        $pdo->prepare("DELETE FROM item_photos WHERE item_type = ? AND item_id = ? AND id IN ($in)")->execute([$type, $id]);
    }
    $new = json_decode($_POST['extra_photos'] ?? '[]', true);
    if (!is_array($new) || !$new) return null;
    $cnt = $pdo->prepare("SELECT COUNT(*) FROM item_photos WHERE item_type = ? AND item_id = ?");
    $cnt->execute([$type, $id]);
    $room = MAX_EXTRA_PHOTOS - intval($cnt->fetchColumn());
    if (count($new) > $room) return 'You can add up to ' . MAX_EXTRA_PHOTOS . ' extra photos.';
    $ins = $pdo->prepare("INSERT INTO item_photos (item_type, item_id, image_url) VALUES (?, ?, ?)");
    foreach ($new as $data) {
        $url = save_image_data($data);
        if (!$url) return 'One of the extra photos could not be saved. Please use JPG, PNG or WebP.';
        $ins->execute([$type, $id, $url]);
    }
    return null;
}

function attach_item_photos($pdo, $rows, $type) {
    ensure_item_photos($pdo);
    $by = [];
    $st = $pdo->prepare("SELECT id, item_id, image_url FROM item_photos WHERE item_type = ? ORDER BY id");
    $st->execute([$type]);
    foreach ($st->fetchAll() as $p) $by[$p['item_id']][] = ['id' => intval($p['id']), 'image_url' => $p['image_url']];
    foreach ($rows as &$r) $r['photos'] = $by[$r['id']] ?? [];
    return $rows;
}

function ensure_product_coords($pdo) {
    try {
        if (!$pdo->query("SHOW COLUMNS FROM products LIKE 'lat'")->fetch()) {
            $pdo->exec("ALTER TABLE products ADD COLUMN lat DECIMAL(10,7) NULL, ADD COLUMN lng DECIMAL(10,7) NULL");
        }
    } catch (Exception $e) {}
}

function require_admin() {
    if (($_SESSION['user_role'] ?? '') !== 'admin') {
        echo json_encode(['success' => false, 'message' => 'Admin login required.']);
        exit;
    }
}

function valid_coords($lat, $lng) {
    return is_numeric($lat) && is_numeric($lng) && $lat >= -90 && $lat <= 90 && $lng >= -180 && $lng <= 180;
}
