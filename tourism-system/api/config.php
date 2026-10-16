<?php
$host = 'localhost';
$dbname = 'tourgo_db';
$username = 'root';
$password = '';

define('APP_BASE_URL', 'https://institutions-contains-rapid-annie.trycloudflare.com');

function app_is_https() {
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') return true;
    return strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    die(json_encode(['success' => false, 'message' => 'Database connection failed.']));
}

if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.gc_maxlifetime', 60 * 60 * 24 * 30);
    session_set_cookie_params(['lifetime' => 60 * 60 * 24 * 30, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax', 'secure' => app_is_https()]);
    session_start();
}

function app_base_url() {
    if (APP_BASE_URL !== '') return rtrim(APP_BASE_URL, '/');
    $https = app_is_https();
    $hostHeader = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? 'localhost';
    $hostOnly = preg_replace('/:\d+$/', '', $hostHeader);
    $port = preg_match('/:(\d+)$/', $hostHeader, $m) ? ':' . $m[1] : '';
    if (in_array($hostOnly, ['localhost', '127.0.0.1', '[::1]', '::1'], true)) {
        $ip = $_SERVER['SERVER_ADDR'] ?? '';
        if ($ip === '' || $ip === '::1' || strpos($ip, '127.') === 0) $ip = gethostbyname(gethostname());
        $hostOnly = $ip;
    }
    $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    $dir = preg_replace('#/api$#', '', $dir);
    return ($https ? 'https://' : 'http://') . $hostOnly . $port . $dir;
}

function ensure_scan_log($pdo) {
    if ($pdo->query("SHOW TABLES LIKE 'scan_log'")->fetch()) return;
    $pdo->exec("CREATE TABLE scan_log (
        id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, spot_id INT NOT NULL, points INT NOT NULL DEFAULT 0,
        scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, KEY idx_time (scanned_at), KEY idx_spot (spot_id), KEY idx_user (user_id)
    )");
    try { $pdo->exec("INSERT INTO scan_log (user_id, spot_id, points, scanned_at) SELECT user_id, spot_id, points, scanned_at FROM spot_scans"); } catch (Exception $e) {}
}

function ensure_user_profile_cols($pdo) {
    $cols = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('age', $cols, true)) $pdo->exec("ALTER TABLE users ADD COLUMN age INT NULL");
    if (!in_array('gender', $cols, true)) $pdo->exec("ALTER TABLE users ADD COLUMN gender VARCHAR(20) NULL");
    if (!in_array('origin', $cols, true)) $pdo->exec("ALTER TABLE users ADD COLUMN origin VARCHAR(120) NULL");
}

function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function admin_log($pdo, $icon, $tone, $html) {
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS admin_log (
            id INT AUTO_INCREMENT PRIMARY KEY, admin_id INT NOT NULL, icon VARCHAR(40) NOT NULL, tone VARCHAR(4) NOT NULL DEFAULT 't0',
            text VARCHAR(400) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, KEY idx_admin (admin_id, id)
        )");
        $pdo->prepare("INSERT INTO admin_log (admin_id, icon, tone, text) VALUES (?, ?, ?, ?)")
            ->execute([intval($_SESSION['user_id'] ?? 0), $icon, $tone, mb_substr($html, 0, 400)]);
        $aid = intval($_SESSION['user_id'] ?? 0);
        $pdo->prepare("DELETE FROM admin_log WHERE admin_id = ? AND id NOT IN (SELECT id FROM (SELECT id FROM admin_log WHERE admin_id = ? ORDER BY id DESC LIMIT 5) keep5)")->execute([$aid, $aid]);
    } catch (Exception $e) {  }
}

const FIRST_SCANS = "SELECT MIN(id) AS id FROM scan_log GROUP BY user_id, spot_id";

function ensure_group_visits($pdo) {
    ensure_scan_log($pdo);
    $cols = $pdo->query("SHOW COLUMNS FROM scan_log")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('visit_type', $cols, true)) $pdo->exec("ALTER TABLE scan_log ADD COLUMN visit_type VARCHAR(10) NOT NULL DEFAULT 'solo', ADD COLUMN group_size INT NOT NULL DEFAULT 1");
    $pdo->exec("CREATE TABLE IF NOT EXISTS scan_companions (
        id INT AUTO_INCREMENT PRIMARY KEY, scan_id INT NOT NULL, gender VARCHAR(10) NOT NULL, age INT NOT NULL,
        KEY idx_scan (scan_id)
    )");
}

function ensure_one_review_per_user($pdo) {
    if ($pdo->query("SHOW INDEX FROM reviews WHERE Key_name = 'uniq_user_item'")->fetch()) return;
    try {
        $dupItems = $pdo->query("SELECT DISTINCT item_type, item_id FROM reviews WHERE user_id > 0
            GROUP BY user_id, item_type, item_id HAVING COUNT(*) > 1")->fetchAll();
        $pdo->exec("UPDATE reviews keep
            JOIN (SELECT user_id, item_type, item_id, MAX(id) AS keep_id FROM reviews WHERE user_id > 0 GROUP BY user_id, item_type, item_id HAVING COUNT(*) > 1) d ON keep.id = d.keep_id
            JOIN reviews old ON old.user_id = d.user_id AND old.item_type = d.item_type AND old.item_id = d.item_id AND old.id < d.keep_id AND old.admin_reply IS NOT NULL
            SET keep.admin_reply = old.admin_reply, keep.admin_reply_date = old.admin_reply_date
            WHERE keep.admin_reply IS NULL");
        $pdo->exec("DELETE old FROM reviews old
            JOIN (SELECT user_id, item_type, item_id, MAX(id) AS keep_id FROM reviews WHERE user_id > 0 GROUP BY user_id, item_type, item_id) d
              ON old.user_id = d.user_id AND old.item_type = d.item_type AND old.item_id = d.item_id AND old.id < d.keep_id");
        foreach ($dupItems as $it) refresh_item_rating($pdo, $it['item_type'], $it['item_id']);
        $pdo->exec("ALTER TABLE reviews ADD UNIQUE KEY uniq_user_item (user_id, item_type, item_id)");
    } catch (Exception $e) {}
}

function ensure_ticket_items($pdo) {
    $cols = $pdo->query("SHOW COLUMNS FROM ticket_items")->fetchAll(PDO::FETCH_COLUMN);
    if (in_array('old_key', $cols, true)) return;
    $pdo->exec("ALTER TABLE ticket_items ADD COLUMN kind VARCHAR(10) NOT NULL DEFAULT 'ticket', ADD COLUMN slots INT NULL, ADD COLUMN old_key VARCHAR(40) NULL");
    $ins = $pdo->prepare("INSERT INTO ticket_items (name, cost, icon, kind, old_key) VALUES (?, ?, ?, 'reward', ?)");
    $ins->execute(['Free Water Bottle', 500, 'fa-tint', 'water_bottle']);
    $ins->execute(['Free Local Trip', 5000, 'fa-map-marked-alt', 'local_trip']);
}
function ticket_items_list($pdo, $id = 0) {
    ensure_ticket_items($pdo);
    $sql = "SELECT i.id, i.name, i.cost, i.icon, i.kind, i.slots,
                   (SELECT COUNT(*) FROM redeemed_items r WHERE BINARY r.kind = BINARY i.kind AND (BINARY r.item_ref = BINARY CAST(i.id AS CHAR) OR (i.old_key IS NOT NULL AND BINARY r.item_ref = BINARY i.old_key))) AS used
            FROM ticket_items i" . ($id ? " WHERE i.id = " . intval($id) : '') . " ORDER BY i.kind, i.cost, i.id";
    try { $rows = $pdo->query($sql)->fetchAll(); }
    catch (Exception $e) { $rows = $pdo->query(str_replace("(SELECT COUNT(*) FROM redeemed_items r WHERE BINARY r.kind = BINARY i.kind AND (BINARY r.item_ref = BINARY CAST(i.id AS CHAR) OR (i.old_key IS NOT NULL AND BINARY r.item_ref = BINARY i.old_key)))", '0', $sql))->fetchAll(); }
    foreach ($rows as &$r) {
        $r['id'] = intval($r['id']); $r['cost'] = intval($r['cost']); $r['used'] = intval($r['used']);
        $r['slots'] = $r['slots'] === null ? null : intval($r['slots']);
        $r['left'] = $r['slots'] === null ? null : max(0, $r['slots'] - $r['used']);
    }
    return $rows;
}

function refresh_item_rating($pdo, $type, $id) {
    $table = $type === 'spot' ? 'tourist_spots' : ($type === 'product' ? 'products' : null);
    if (!$table) return;
    $st = $pdo->prepare("SELECT ROUND(AVG(rating), 1) FROM reviews WHERE item_type = ? AND item_id = ?");
    $st->execute([$type, $id]);
    $avg = $st->fetchColumn();
    $pdo->prepare("UPDATE $table SET rating = ? WHERE id = ?")->execute([$avg === null ? 0 : $avg, $id]);
}
