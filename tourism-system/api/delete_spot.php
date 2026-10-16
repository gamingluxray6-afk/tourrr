<?php
require __DIR__ . '/config.php';
require __DIR__ . '/image_helper.php';
header('Content-Type: application/json');
require_admin();

try {
    $id = intval($_POST['id'] ?? 0);
    $st = $pdo->prepare("SELECT name, image_url FROM tourist_spots WHERE id = ?");
    $st->execute([$id]);
    $spot = $st->fetch();
    if (!$spot) { echo json_encode(['success' => false, 'message' => 'Spot not found.']); exit; }

    // Extra photos are files on disk too, so collect them before the rows go away.
    $photos = [];
    try { $ph = $pdo->prepare("SELECT image_url FROM item_photos WHERE item_type = 'spot' AND item_id = ?"); $ph->execute([$id]); $photos = $ph->fetchAll(PDO::FETCH_COLUMN); } catch (Exception $e) {}

    // scan_log is kept on purpose: it is visit history for analytics and joins to tourist_spots, so old rows just drop out.
    $pdo->beginTransaction();
    foreach (["DELETE FROM spot_qr WHERE spot_id = ?", "DELETE FROM spot_scans WHERE spot_id = ?",
              "DELETE FROM reviews WHERE item_type = 'spot' AND item_id = ?", "DELETE FROM item_photos WHERE item_type = 'spot' AND item_id = ?"] as $sql) {
        try { $pdo->prepare($sql)->execute([$id]); } catch (PDOException $e) { if ($e->getCode() !== '42S02') throw $e; } // table not created yet
    }
    $pdo->prepare("DELETE FROM tourist_spots WHERE id = ?")->execute([$id]);
    $pdo->commit();

    delete_old_image($spot['image_url']);
    foreach ($photos as $p) delete_old_image($p);
    admin_log($pdo, 'fa-trash', 't0', 'Deleted the spot <b>' . h($spot['name']) . '</b>');
    echo json_encode(['success' => true, 'message' => "Spot \"{$spot['name']}\" deleted."]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
