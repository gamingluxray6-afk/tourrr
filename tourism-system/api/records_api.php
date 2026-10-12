<?php
require __DIR__ . '/config.php';
header('Content-Type: application/json');
if (($_SESSION['user_role'] ?? '') !== 'admin') { echo json_encode(['success' => false, 'message' => 'Admin login required.']); exit; }
$a = $_POST['action'] ?? '';
try {
    if ($a === 'add') {
        $pdo->prepare("INSERT INTO records (location, visitors, record_date) VALUES (?, ?, ?)")->execute([$_POST['location'] ?? '', intval($_POST['visitors'] ?? 0), $_POST['record_date'] ?? date('Y-m-d')]);
        admin_log($pdo, 'fa-clipboard-list', 't2', 'Added a visitor record: <b>' . h($_POST['location'] ?? '') . '</b>, ' . intval($_POST['visitors'] ?? 0) . ' visitors');
        echo json_encode(['success' => true, 'message' => 'Record added!']);
    } elseif ($a === 'edit') {
        $pdo->prepare("UPDATE records SET location=?, visitors=?, record_date=? WHERE id=?")->execute([$_POST['location'] ?? '', intval($_POST['visitors'] ?? 0), $_POST['record_date'] ?? date('Y-m-d'), intval($_POST['id'] ?? 0)]);
        admin_log($pdo, 'fa-clipboard-list', 't2', 'Edited a visitor record: <b>' . h($_POST['location'] ?? '') . '</b>');
        echo json_encode(['success' => true, 'message' => 'Record updated!']);
    } elseif ($a === 'delete') {
        $old = $pdo->prepare("SELECT location, visitors FROM records WHERE id = ?"); $old->execute([intval($_POST['id'] ?? 0)]); $old = $old->fetch();
        $pdo->prepare("DELETE FROM records WHERE id=?")->execute([intval($_POST['id'] ?? 0)]);
        if ($old) admin_log($pdo, 'fa-trash', 't2', 'Deleted a visitor record: <b>' . h($old['location']) . '</b> (' . intval($old['visitors']) . ' visitors)');
        echo json_encode(['success' => true, 'message' => 'Record deleted.']);
    } else { echo json_encode(['success' => false, 'message' => 'Unknown action.']); }
} catch (Exception $e) { echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]); }
