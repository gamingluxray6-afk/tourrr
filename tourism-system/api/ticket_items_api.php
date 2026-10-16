<?php
require __DIR__ . '/config.php';
require __DIR__ . '/image_helper.php';
header('Content-Type: application/json');

try {
    $action = $_POST['action'] ?? $_GET['action'] ?? 'list';
    if ($action === 'list') { echo json_encode(['success' => true, 'items' => ticket_items_list($pdo)]); exit; }

    require_admin();
    ensure_ticket_items($pdo);

    if ($action === 'save') {
        $id = intval($_POST['id'] ?? 0);
        $kind = ($_POST['kind'] ?? '') === 'reward' ? 'reward' : 'ticket';
        $name = trim(preg_replace('/\s+/', ' ', $_POST['name'] ?? ''));
        $cost = intval($_POST['cost'] ?? 0);
        $icon = preg_match('/^fa-[a-z0-9-]{1,40}$/', $_POST['icon'] ?? '') ? $_POST['icon'] : 'fa-ticket';
        $slotsRaw = trim($_POST['slots'] ?? '');
        $slots = $slotsRaw === '' ? null : intval($slotsRaw);
        if ($name === '' || mb_strlen($name) > 100) { echo json_encode(['success' => false, 'message' => 'Please enter a name.']); exit; }
        if ($cost < 1 || $cost > 1000000) { echo json_encode(['success' => false, 'message' => 'Points needed must be from 1 to 1,000,000.']); exit; }
        if ($slots !== null && ($slots < 0 || $slots > 100000)) { echo json_encode(['success' => false, 'message' => 'Slots must be from 0 to 100,000, or empty for no limit.']); exit; }
        $what = $kind === 'reward' ? 'reward' : 'ticket';
        if ($id) {
            $up = $pdo->prepare("UPDATE ticket_items SET name = ?, cost = ?, icon = ?, slots = ? WHERE id = ?");
            $up->execute([$name, $cost, $icon, $slots, $id]);
            if (!$pdo->query("SELECT id FROM ticket_items WHERE id = $id")->fetch()) { echo json_encode(['success' => false, 'message' => 'Item not found.']); exit; }
            admin_log($pdo, 'fa-ticket', 't3', "Edited the $what <b>" . h($name) . '</b>');
            echo json_encode(['success' => true, 'message' => ucfirst($what) . ' updated.']);
        } else {
            $pdo->prepare("INSERT INTO ticket_items (name, cost, icon, kind, slots) VALUES (?, ?, ?, ?, ?)")->execute([$name, $cost, $icon, $kind, $slots]);
            admin_log($pdo, 'fa-ticket', 't3', "Added the $what <b>" . h($name) . '</b>' . ($slots !== null ? " ($slots slots)" : ''));
            echo json_encode(['success' => true, 'message' => ucfirst($what) . " \"$name\" added."]);
        }
        exit;
    }

    if ($action === 'delete') {
        $id = intval($_POST['id'] ?? 0);
        $st = $pdo->prepare("SELECT name, kind FROM ticket_items WHERE id = ?"); $st->execute([$id]); $it = $st->fetch();
        if (!$it) { echo json_encode(['success' => false, 'message' => 'Item not found.']); exit; }
        $pdo->prepare("DELETE FROM ticket_items WHERE id = ?")->execute([$id]);
        admin_log($pdo, 'fa-trash', 't3', 'Deleted the ' . ($it['kind'] === 'reward' ? 'reward' : 'ticket') . ' <b>' . h($it['name']) . '</b>');
        echo json_encode(['success' => true, 'message' => "\"{$it['name']}\" deleted."]);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Unknown action.']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
