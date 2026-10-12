<?php
require __DIR__ . '/config.php';
require __DIR__ . '/image_helper.php';
header('Content-Type: application/json');

function ensure_stores($pdo) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS stores (
        id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(120) NOT NULL, lat DECIMAL(10,7) NULL, lng DECIMAL(10,7) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    ensure_product_coords($pdo);
    if (!$pdo->query("SHOW COLUMNS FROM stores LIKE 'image_url'")->fetch()) $pdo->exec("ALTER TABLE stores ADD COLUMN image_url VARCHAR(255) NULL");
    $rows = $pdo->query("SELECT TRIM(p.location) AS name, MAX(p.lat) AS lat, MAX(p.lng) AS lng FROM products p
                         LEFT JOIN stores s ON LOWER(TRIM(s.name)) = LOWER(TRIM(p.location))
                         WHERE s.id IS NULL AND TRIM(p.location) <> '' GROUP BY LOWER(TRIM(p.location))")->fetchAll();
    $ins = $pdo->prepare("INSERT INTO stores (name, lat, lng) VALUES (?, ?, ?)");
    foreach ($rows as $r) $ins->execute([ucwords(strtolower($r['name'])), $r['lat'], $r['lng']]);
}

try {
    ensure_stores($pdo);
    $action = $_POST['action'] ?? $_GET['action'] ?? 'list';

    if ($action === 'list') {
        $rows = $pdo->query("SELECT s.id, s.name, s.lat, s.lng, s.image_url, COUNT(p.id) AS items FROM stores s
                             LEFT JOIN products p ON LOWER(TRIM(p.location)) = LOWER(TRIM(s.name))
                             GROUP BY s.id ORDER BY s.name")->fetchAll();
        foreach ($rows as &$r) { $r['id'] = intval($r['id']); $r['items'] = intval($r['items']); }
        echo json_encode(['success' => true, 'stores' => $rows]);
        exit;
    }

    require_admin();

    if ($action === 'save') {
        $id = intval($_POST['id'] ?? 0);
        $name = trim(preg_replace('/\s+/', ' ', $_POST['name'] ?? ''));
        $lat = $_POST['lat'] ?? ''; $lng = $_POST['lng'] ?? '';
        if ($name === '' || mb_strlen($name) > 100) { echo json_encode(['success' => false, 'message' => 'Please enter the store name.']); exit; }
        if (!valid_coords($lat, $lng)) { echo json_encode(['success' => false, 'message' => 'Please pin where the store is on the map.']); exit; }
        $dup = $pdo->prepare("SELECT id FROM stores WHERE LOWER(TRIM(name)) = LOWER(?) AND id <> ?");
        $dup->execute([$name, $id]);
        if ($dup->fetch()) { echo json_encode(['success' => false, 'message' => "There is already a store called \"$name\"."]); exit; }
        $img = null;
        if (!empty($_POST['image_base64'])) {
            $img = save_image_data($_POST['image_base64']);
            if (!$img) { echo json_encode(['success' => false, 'message' => 'The photo could not be saved. Please use a JPG, PNG or WebP picture.']); exit; }
        }
        if ($id) {
            $old = $pdo->prepare("SELECT name, image_url FROM stores WHERE id = ?"); $old->execute([$id]); $oldRow = $old->fetch(); $oldName = $oldRow ? $oldRow['name'] : false;
            if ($oldName === false) { echo json_encode(['success' => false, 'message' => 'Store not found.']); exit; }
            $pdo->prepare("UPDATE stores SET name = ?, lat = ?, lng = ? WHERE id = ?")->execute([$name, $lat, $lng, $id]);
            if ($img) { delete_old_image($oldRow['image_url']); $pdo->prepare("UPDATE stores SET image_url = ? WHERE id = ?")->execute([$img, $id]); }
            $pdo->prepare("UPDATE products SET location = ?, lat = ?, lng = ? WHERE LOWER(TRIM(location)) = LOWER(TRIM(?))")->execute([$name, $lat, $lng, $oldName]);
            admin_log($pdo, 'fa-store', 't1', 'Edited the store <b>' . h($name) . '</b>');
            echo json_encode(['success' => true, 'message' => 'Store updated.', 'name' => $name]);
        } else {
            $pdo->prepare("INSERT INTO stores (name, lat, lng, image_url) VALUES (?, ?, ?, ?)")->execute([$name, $lat, $lng, $img]);
            admin_log($pdo, 'fa-store', 't1', 'Added the store <b>' . h($name) . '</b>');
            echo json_encode(['success' => true, 'message' => "Store \"$name\" added.", 'name' => $name, 'id' => intval($pdo->lastInsertId())]);
        }
        exit;
    }

    if ($action === 'delete') {
        $id = intval($_POST['id'] ?? 0);
        $st = $pdo->prepare("SELECT name FROM stores WHERE id = ?"); $st->execute([$id]); $name = $st->fetchColumn();
        if ($name === false) { echo json_encode(['success' => false, 'message' => 'Store not found.']); exit; }
        $c = $pdo->prepare("SELECT COUNT(*) FROM products WHERE LOWER(TRIM(location)) = LOWER(TRIM(?))"); $c->execute([$name]);
        if ($n = intval($c->fetchColumn())) { echo json_encode(['success' => false, 'message' => "\"$name\" still sells $n product(s). Move or delete them first."]); exit; }
        $im = $pdo->prepare("SELECT image_url FROM stores WHERE id = ?"); $im->execute([$id]); delete_old_image($im->fetchColumn());
        $pdo->prepare("DELETE FROM stores WHERE id = ?")->execute([$id]);
        admin_log($pdo, 'fa-store', 't1', 'Deleted the store <b>' . h($name) . '</b>');
        echo json_encode(['success' => true, 'message' => "Store \"$name\" deleted."]);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Unknown action.']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
