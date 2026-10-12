-- FRESH START: run this ONCE in phpMyAdmin (database tourgo_db > SQL tab > paste > Go).
-- It deletes all spots, products, reviews, visitor records, QR codes and check-ins, so you can add your own.
-- It keeps your user accounts (admin and tourists) and the redeemable ticket items. Tourist points go back to 0.
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE reviews;
TRUNCATE TABLE records;
TRUNCATE TABLE products;
TRUNCATE TABLE tourist_spots;
DROP TABLE IF EXISTS spot_scans;
DROP TABLE IF EXISTS scan_log;
DROP TABLE IF EXISTS spot_qr;
UPDATE users SET points = 0 WHERE role <> 'admin';
SET FOREIGN_KEY_CHECKS = 1;
