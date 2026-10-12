<?php
require __DIR__ . '/config.php';
header('Content-Type: application/json');

$uid = intval($_SESSION['user_id'] ?? 0);
if (!$uid) { echo json_encode(['success' => false, 'message' => 'Please log in first.']); exit; }
$admin = ($_SESSION['user_role'] ?? '') === 'admin';
$limit = $admin ? 5 : 8;

function table_exists($pdo, $t) { return (bool)$pdo->query("SHOW TABLES LIKE " . $pdo->quote($t))->fetch(); }

try {
    if ($admin) {
        $rows = [];
        if (table_exists($pdo, 'admin_log')) {
            $st = $pdo->prepare("SELECT icon, tone, text, created_at FROM admin_log WHERE admin_id = ? ORDER BY id DESC LIMIT $limit");
            $st->execute([$uid]); $rows = $st->fetchAll();
        }
        $events = array_map(fn($r) => ['icon' => $r['icon'], 'tone' => $r['tone'], 'at' => $r['created_at'], 'text' => $r['text']], $rows);
        echo json_encode(['success' => true, 'events' => $events, 'now' => date('Y-m-d H:i:s'), 'admin' => true]);
        exit;
    }
    $events = [];
    $add = function ($rows, $build) use (&$events) { foreach ($rows as $r) { $e = $build($r); if ($e) $events[] = $e; } };
    $q = function ($sql, $params = []) use ($pdo) { $st = $pdo->prepare($sql); $st->execute($params); return $st->fetchAll(); };
    $mine = $admin ? '' : ' WHERE x.user_id = ?';
    $p = $admin ? [] : [$uid];

    if ($admin) {
        $add($q("SELECT name, role, created_at FROM users ORDER BY created_at DESC LIMIT $limit"), fn($r) => [
            'icon' => 'fa-user-plus', 'tone' => 't0', 'at' => $r['created_at'],
            'text' => "<b>" . htmlspecialchars($r['name']) . "</b> made a new " . ($r['role'] === 'admin' ? 'admin' : 'tourist') . " account"]);
    } else {
        $add($q("SELECT created_at FROM users WHERE id = ?", [$uid]), fn($r) => ['icon' => 'fa-user-plus', 'tone' => 't0', 'at' => $r['created_at'], 'text' => 'You joined Tourgo']);
    }

    if (table_exists($pdo, 'scan_log')) {
        $cols = $pdo->query("SHOW COLUMNS FROM scan_log")->fetchAll(PDO::FETCH_COLUMN);
        $grp = in_array('group_size', $cols, true) ? ', x.group_size' : ', 1 AS group_size';
        $add($q("SELECT x.scanned_at, x.points$grp, t.name AS spot, u.name AS who FROM scan_log x JOIN (" . FIRST_SCANS . ") f ON f.id = x.id
                 JOIN tourist_spots t ON t.id = x.spot_id LEFT JOIN users u ON u.id = x.user_id$mine
                 ORDER BY x.scanned_at DESC LIMIT $limit", $p), function ($r) use ($admin) {
            $g = intval($r['group_size']) > 1 ? ' with a group of ' . intval($r['group_size']) : '';
            $pts = intval($r['points']) ? ' <em>+' . intval($r['points']) . ' pts</em>' : '';
            $who = $admin ? '<b>' . htmlspecialchars($r['who'] ?: 'Someone') . '</b> checked in at' : 'You checked in at';
            return ['icon' => 'fa-qrcode', 'tone' => 't1', 'at' => $r['scanned_at'], 'text' => "$who <b>" . htmlspecialchars($r['spot']) . "</b>$g$pts"];
        });
    }

    $add($q("SELECT x.created_at, x.rating, x.item_type, x.user_name,
                    COALESCE(s.name, p.name) AS item FROM reviews x
             LEFT JOIN tourist_spots s ON x.item_type = 'spot' AND s.id = x.item_id
             LEFT JOIN products p ON x.item_type = 'product' AND p.id = x.item_id$mine
             ORDER BY x.created_at DESC LIMIT $limit", $p), function ($r) use ($admin) {
        if (!$r['item']) return null;
        $who = $admin ? '<b>' . htmlspecialchars($r['user_name']) . '</b> rated' : 'You rated';
        return ['icon' => 'fa-star', 'tone' => 't2', 'at' => $r['created_at'], 'text' => "$who <b>" . htmlspecialchars($r['item']) . "</b> " . intval($r['rating']) . '★'];
    });

    if (table_exists($pdo, 'redeemed_items')) {
        $rows = $q("SELECT x.item_name, x.points, x.created_at, x.used_at, u.name AS who FROM redeemed_items x
                    LEFT JOIN users u ON u.id = x.user_id$mine ORDER BY x.id DESC LIMIT $limit", $p);
        $add($rows, fn($r) => ['icon' => 'fa-ticket', 'tone' => 't3', 'at' => $r['created_at'],
            'text' => ($admin ? '<b>' . htmlspecialchars($r['who'] ?: 'Someone') . '</b> redeemed' : 'You redeemed') . ' <b>' . htmlspecialchars($r['item_name']) . '</b> <em>-' . intval($r['points']) . ' pts</em>']);
        $add($rows, fn($r) => $r['used_at'] ? ['icon' => 'fa-hand-holding-heart', 'tone' => 't4', 'at' => $r['used_at'],
            'text' => ($admin ? 'Ticket of <b>' . htmlspecialchars($r['who'] ?: 'someone') . '</b> claimed:' : 'You claimed') . ' <b>' . htmlspecialchars($r['item_name']) . '</b>'] : null);
    }

    usort($events, fn($a, $b) => strcmp((string)$b['at'], (string)$a['at']));
    echo json_encode(['success' => true, 'events' => array_slice($events, 0, $limit), 'now' => date('Y-m-d H:i:s')]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
