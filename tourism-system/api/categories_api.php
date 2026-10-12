<?php
require __DIR__ . '/config.php';
header('Content-Type: application/json');

const CAT_DEFAULTS = [
    ['nature', 'Nature', 'fa-leaf', '#10b981'],
    ['adventure', 'Adventure', 'fa-person-hiking', '#ef4444'],
    ['cultural', 'Cultural', 'fa-landmark', '#f59e0b'],
];
const CAT_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#0d9488', '#f97316', '#64748b', '#84cc16', '#06b6d4', '#a16207'];

function ensure_categories($pdo) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS spot_categories (
        id INT AUTO_INCREMENT PRIMARY KEY, slug VARCHAR(40) NOT NULL UNIQUE, name VARCHAR(60) NOT NULL,
        icon VARCHAR(50) NOT NULL DEFAULT 'fa-map-pin', color VARCHAR(7) NOT NULL DEFAULT '#0d9488',
        sort INT NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    if (!$pdo->query("SELECT COUNT(*) FROM spot_categories")->fetchColumn()) {
        $ins = $pdo->prepare("INSERT IGNORE INTO spot_categories (slug, name, icon, color, sort) VALUES (?, ?, ?, ?, ?)");
        foreach (CAT_DEFAULTS as $i => $c) $ins->execute([$c[0], $c[1], $c[2], $c[3], $i]);
    }
    $missing = $pdo->query("SELECT DISTINCT s.category FROM tourist_spots s LEFT JOIN spot_categories c ON c.slug = s.category
                            WHERE c.id IS NULL AND s.category <> ''")->fetchAll(PDO::FETCH_COLUMN);
    $ins = $pdo->prepare("INSERT IGNORE INTO spot_categories (slug, name, icon, color, sort) VALUES (?, ?, 'fa-map-pin', ?, 99)");
    foreach ($missing as $i => $slug) $ins->execute([$slug, ucwords(str_replace(['-', '_'], ' ', $slug)), CAT_COLORS[($i + 3) % count(CAT_COLORS)]]);
}

function slugify($s) {
    $s = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $s), '-'));
    return substr($s, 0, 30);
}

try {
    ensure_categories($pdo);
    $action = $_POST['action'] ?? $_GET['action'] ?? 'list';

    if ($action === 'list') {
        $rows = $pdo->query("SELECT c.id, c.slug, c.name, c.icon, c.color, COUNT(s.id) AS spots
                             FROM spot_categories c LEFT JOIN tourist_spots s ON s.category = c.slug
                             GROUP BY c.id ORDER BY c.sort, c.name")->fetchAll();
        foreach ($rows as &$r) { $r['id'] = intval($r['id']); $r['spots'] = intval($r['spots']); }
        echo json_encode(['success' => true, 'categories' => $rows]);
        exit;
    }

    if (($_SESSION['user_role'] ?? '') !== 'admin') { echo json_encode(['success' => false, 'message' => 'Admin login required.']); exit; }

    if ($action === 'save') {
        $id = intval($_POST['id'] ?? 0);
        $name = trim(preg_replace('/\s+/', ' ', $_POST['name'] ?? ''));
        $icon = $_POST['icon'] ?? 'fa-map-pin';
        $color = strtolower($_POST['color'] ?? '#0d9488');
        if ($name === '' || mb_strlen($name) > 40) { echo json_encode(['success' => false, 'message' => 'Please enter a category name (up to 40 letters).']); exit; }
        if (!preg_match('/^fa-[a-z0-9-]{1,40}$/', $icon)) $icon = 'fa-map-pin';
        if (!preg_match('/^#[0-9a-f]{6}$/', $color)) $color = '#0d9488';
        $dup = $pdo->prepare("SELECT id FROM spot_categories WHERE LOWER(name) = LOWER(?) AND id <> ?");
        $dup->execute([$name, $id]);
        if ($dup->fetch()) { echo json_encode(['success' => false, 'message' => "There is already a category called \"$name\"."]); exit; }
        if ($id) {
            $pdo->prepare("UPDATE spot_categories SET name = ?, icon = ?, color = ? WHERE id = ?")->execute([$name, $icon, $color, $id]);
            admin_log($pdo, 'fa-tags', 't5', 'Edited the category <b>' . h($name) . '</b>');
            echo json_encode(['success' => true, 'message' => 'Category updated.']);
        } else {
            $slug = slugify($name) ?: 'category';
            $base = $slug; $n = 2;
            $chk = $pdo->prepare("SELECT COUNT(*) FROM spot_categories WHERE slug = ?");
            while (true) { $chk->execute([$slug]); if (!$chk->fetchColumn()) break; $slug = substr($base, 0, 26) . '-' . $n++; }
            $sort = intval($pdo->query("SELECT COALESCE(MAX(sort), 0) + 1 FROM spot_categories")->fetchColumn());
            $pdo->prepare("INSERT INTO spot_categories (slug, name, icon, color, sort) VALUES (?, ?, ?, ?, ?)")->execute([$slug, $name, $icon, $color, $sort]);
            admin_log($pdo, 'fa-tags', 't5', 'Added the category <b>' . h($name) . '</b>');
            echo json_encode(['success' => true, 'message' => "Category \"$name\" added.", 'slug' => $slug]);
        }
        exit;
    }

    if ($action === 'delete') {
        $id = intval($_POST['id'] ?? 0);
        $st = $pdo->prepare("SELECT slug, name FROM spot_categories WHERE id = ?"); $st->execute([$id]);
        $cat = $st->fetch();
        if (!$cat) { echo json_encode(['success' => false, 'message' => 'Category not found.']); exit; }
        if (intval($pdo->query("SELECT COUNT(*) FROM spot_categories")->fetchColumn()) <= 1) { echo json_encode(['success' => false, 'message' => 'Keep at least one category.']); exit; }
        $cnt = $pdo->prepare("SELECT COUNT(*) FROM tourist_spots WHERE category = ?"); $cnt->execute([$cat['slug']]);
        $used = intval($cnt->fetchColumn());
        if ($used) {
            $to = $_POST['move_to'] ?? '';
            $ok = $pdo->prepare("SELECT COUNT(*) FROM spot_categories WHERE slug = ? AND id <> ?"); $ok->execute([$to, $id]);
            if (!$ok->fetchColumn()) { echo json_encode(['success' => false, 'message' => "$used spot(s) use \"{$cat['name']}\". Choose a category to move them to.", 'used' => $used]); exit; }
            $pdo->prepare("UPDATE tourist_spots SET category = ? WHERE category = ?")->execute([$to, $cat['slug']]);
        }
        $pdo->prepare("DELETE FROM spot_categories WHERE id = ?")->execute([$id]);
        admin_log($pdo, 'fa-tags', 't5', 'Deleted the category <b>' . h($cat['name']) . '</b>');
        echo json_encode(['success' => true, 'message' => "Category \"{$cat['name']}\" deleted." . ($used ? " $used spot(s) moved." : '')]);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Unknown action.']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
