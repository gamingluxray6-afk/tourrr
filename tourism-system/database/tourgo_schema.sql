CREATE DATABASE IF NOT EXISTS `tourgo_db` CHARACTER SET utf8mb4;
USE `tourgo_db`;

CREATE TABLE IF NOT EXISTS `admin_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_id` int(11) NOT NULL,
  `icon` varchar(40) NOT NULL,
  `tone` varchar(4) NOT NULL DEFAULT 't0',
  `text` varchar(400) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_admin` (`admin_id`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `app_seed_flags` (
  `name` varchar(50) NOT NULL,
  `done_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `item_photos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `item_type` varchar(10) NOT NULL,
  `item_id` int(11) NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_item` (`item_type`,`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `category` varchar(30) NOT NULL,
  `location` varchar(200) NOT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `rating` decimal(3,1) NOT NULL DEFAULT 0.0,
  `image_url` longtext DEFAULT NULL,
  `description` text DEFAULT NULL,
  `features` text DEFAULT NULL,
  `lat` decimal(10,7) DEFAULT NULL,
  `lng` decimal(10,7) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `records` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `location` varchar(200) NOT NULL,
  `visitors` int(11) NOT NULL DEFAULT 0,
  `record_date` date NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `redeemed_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(16) NOT NULL,
  `token` varchar(32) NOT NULL,
  `user_id` int(11) NOT NULL,
  `kind` varchar(10) NOT NULL,
  `item_ref` varchar(40) NOT NULL,
  `item_name` varchar(120) NOT NULL,
  `item_icon` varchar(50) NOT NULL DEFAULT 'fa-ticket',
  `points` int(11) NOT NULL DEFAULT 0,
  `status` varchar(10) NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `used_at` datetime DEFAULT NULL,
  `used_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL DEFAULT 0,
  `user_name` varchar(100) NOT NULL DEFAULT 'Anonymous',
  `item_type` varchar(20) NOT NULL,
  `item_id` int(11) NOT NULL,
  `rating` tinyint(4) NOT NULL,
  `comment` text DEFAULT NULL,
  `admin_reply` text DEFAULT NULL,
  `admin_reply_date` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_item` (`user_id`,`item_type`,`item_id`),
  KEY `idx_item` (`item_type`,`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `scan_companions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `scan_id` int(11) NOT NULL,
  `gender` varchar(10) NOT NULL,
  `age` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_scan` (`scan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `scan_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `spot_id` int(11) NOT NULL,
  `points` int(11) NOT NULL DEFAULT 0,
  `scanned_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `visit_type` varchar(10) NOT NULL DEFAULT 'solo',
  `group_size` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_time` (`scanned_at`),
  KEY `idx_spot` (`spot_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `spot_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `slug` varchar(40) NOT NULL,
  `name` varchar(60) NOT NULL,
  `icon` varchar(50) NOT NULL DEFAULT 'fa-map-pin',
  `color` varchar(7) NOT NULL DEFAULT '#0d9488',
  `sort` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `spot_qr` (
  `spot_id` int(11) NOT NULL,
  `token` varchar(32) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `regenerated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`spot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `spot_scans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `spot_id` int(11) NOT NULL,
  `points` int(11) NOT NULL DEFAULT 0,
  `scanned_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_spot` (`user_id`,`spot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `stores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `lat` decimal(10,7) DEFAULT NULL,
  `lng` decimal(10,7) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `image_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `ticket_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `cost` int(11) NOT NULL,
  `icon` varchar(50) NOT NULL DEFAULT 'fa-ticket',
  `kind` varchar(10) NOT NULL DEFAULT 'ticket',
  `slots` int(11) DEFAULT NULL,
  `old_key` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `tourist_spots` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `category` varchar(30) NOT NULL,
  `location` varchar(200) NOT NULL,
  `rating` decimal(3,1) NOT NULL DEFAULT 0.0,
  `points_reward` int(11) NOT NULL DEFAULT 0,
  `image_url` longtext DEFAULT NULL,
  `description` text DEFAULT NULL,
  `features` text DEFAULT NULL,
  `lat` decimal(10,7) NOT NULL DEFAULT 16.5314000,
  `lng` decimal(10,7) NOT NULL DEFAULT 120.3941000,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'tourist',
  `points` int(11) NOT NULL DEFAULT 0,
  `phone` varchar(30) DEFAULT NULL,
  `profile_image` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `age` int(11) DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `origin` varchar(120) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `weather_log` (
  `log_date` date NOT NULL,
  `temp_max` decimal(5,1) DEFAULT NULL,
  `temp_min` decimal(5,1) DEFAULT NULL,
  `rain_mm` decimal(6,1) DEFAULT NULL,
  `wind_max` decimal(5,1) DEFAULT NULL,
  `weather_code` int(11) DEFAULT NULL,
  `summary` varchar(60) DEFAULT NULL,
  `saved_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `temp_mean` decimal(5,1) DEFAULT NULL,
  `feels_max` decimal(5,1) DEFAULT NULL,
  `humidity` int(11) DEFAULT NULL,
  `cloud` int(11) DEFAULT NULL,
  `rain_hours` decimal(4,1) DEFAULT NULL,
  `gust_max` decimal(5,1) DEFAULT NULL,
  `wind_dir` int(11) DEFAULT NULL,
  `sun_hours` decimal(4,1) DEFAULT NULL,
  `uv_max` decimal(4,1) DEFAULT NULL,
  `sunrise` varchar(5) DEFAULT NULL,
  `sunset` varchar(5) DEFAULT NULL,
  PRIMARY KEY (`log_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT  IGNORE INTO `ticket_items` VALUES (2,'Food Tasting',350,'fa-utensils','ticket',NULL,NULL);
INSERT  IGNORE INTO `ticket_items` VALUES (6,'Guided Tour',800,'fa-person-hiking','ticket',NULL,NULL);
INSERT  IGNORE INTO `ticket_items` VALUES (7,'Souvenir Pack',1000,'fa-gift','ticket',NULL,NULL);
INSERT  IGNORE INTO `ticket_items` VALUES (8,'Festival VIP',1500,'fa-star','ticket',NULL,NULL);
INSERT  IGNORE INTO `ticket_items` VALUES (9,'Free Water Bottle',500,'fa-tint','reward',NULL,'water_bottle');
INSERT  IGNORE INTO `ticket_items` VALUES (10,'Free Local Trip',5000,'fa-map-marked-alt','reward',NULL,'local_trip');
