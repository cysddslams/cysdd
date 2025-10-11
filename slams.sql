-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Oct 09, 2025 at 11:57 PM
-- Server version: 8.3.0
-- PHP Version: 8.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `slams`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

DROP TABLE IF EXISTS `admins`;
CREATE TABLE IF NOT EXISTS `admins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(199) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password` varchar(199) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `profilePic` varchar(199) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`id`, `username`, `name`, `password`, `profilePic`) VALUES
(1, 'admin', 'City Youth', '$2b$10$uuxD01AszWgYC5rMFEDbJuWfibLHyk8rO7dEig5m5L.qjho8I3DI6', '/uploads/adminProfile/admin_1751422896743.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `coach`
--

DROP TABLE IF EXISTS `coach`;
CREATE TABLE IF NOT EXISTS `coach` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fullname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `position` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `coach_certificate` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` enum('pending','confirmed','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `notification_viewed` tinyint(1) DEFAULT '0',
  `coachProfile` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `coach`
--

INSERT INTO `coach` (`id`, `fullname`, `email`, `phone`, `password`, `position`, `coach_certificate`, `created_at`, `updated_at`, `status`, `notification_viewed`, `coachProfile`) VALUES
(22, 'COACH NG BUHAY MO', 'coach@gmail.com', '09124577314', '$2b$10$UTe86z1Az5jx1Xhmu04p/.vzrEvg3RxCg6dr576P5nNIgaRwiLvSe', 'Sports Coordinator', 'uploads/coach_certificates/1760014307444.pdf', '2025-10-09 12:51:47', '2025-10-09 12:57:34', 'confirmed', 0, NULL),
(23, 'COACH NG LUNA', 'lunacoach@gmail.com', '09124577314', '$2b$10$j2hk0mK9o6yxbHKNM0GYpO/cdyWF9Ee5n/8cfKDBaQdNsFRRA2qF2', 'Sports Coordinator', 'uploads/coach_certificates/1760014766665.pdf', '2025-10-09 12:59:26', '2025-10-09 13:01:57', 'confirmed', 0, NULL),
(24, 'DIVINE', 'divine@gmail.com', '09124577314', '$2b$10$qggIK2KVqoMAj.3TtiWfXu4l2jXydCPLuaFMAaxzcGXtRDt2TGtJS', 'Sports Coordinator', 'uploads/coach_certificates/1760014977811.pdf', '2025-10-09 13:02:57', '2025-10-09 13:03:51', 'confirmed', 0, NULL),
(25, 'CCC', 'ccc@gmail.com', '09124577314', '$2b$10$SGg33u9SBOOaRJlxG5pgKuf7T801vcVpMdi6tDSDxRPirVz3MS/fy', 'Sports Coordinator', 'uploads/coach_certificates/1760015094687.pdf', '2025-10-09 13:04:54', '2025-10-09 13:05:27', 'confirmed', 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
CREATE TABLE IF NOT EXISTS `events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(199) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `sports` text COLLATE utf8mb4_general_ci NOT NULL,
  `esports` varchar(199) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `other_activities` varchar(199) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `image` varchar(199) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `appointmentForm` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `date_schedule` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `location` varchar(199) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('ongoing','expired') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'ongoing',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `events`
--

INSERT INTO `events` (`id`, `title`, `description`, `sports`, `esports`, `other_activities`, `image`, `appointmentForm`, `date_schedule`, `created_at`, `updated_at`, `location`, `status`) VALUES
(15, 'CCAA2025', '🏆 **CCAA 2025** is back!\r\nGet ready for the ultimate showdown as college schools across Calapan City compete in this year’s most anticipated sports event. Witness the spirit of unity, sportsmanship, and excellence in action! 🏐🏀⚽ #CCAA2025 #CalapanCollegeGames\r\n', 'basketball,volleyball,badminton_single,badminton_double', '', '', 'image-1760014481221-536226486.jpg', 'appointmentForm-1760014481222-73353108.pdf', '2025-10-28 08:00:00', '2025-10-09 12:54:41', '2025-10-09 23:19:02', 'LUNA GOCO COLLEGES', 'expired');

-- --------------------------------------------------------

--
-- Table structure for table `matches`
--

DROP TABLE IF EXISTS `matches`;
CREATE TABLE IF NOT EXISTS `matches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bracket_id` int NOT NULL,
  `round_number` int NOT NULL,
  `match_number` int NOT NULL,
  `team1_id` int NOT NULL,
  `team2_id` int DEFAULT NULL,
  `match_date` datetime DEFAULT NULL,
  `venue` varchar(255) DEFAULT NULL,
  `team1_score` int DEFAULT NULL,
  `team2_score` int DEFAULT NULL,
  `winner_team_id` int DEFAULT NULL,
  `status` enum('scheduled','in_progress','completed','cancelled') DEFAULT 'scheduled',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `bracket_id` (`bracket_id`),
  KEY `team1_id` (`team1_id`),
  KEY `team2_id` (`team2_id`),
  KEY `winner_team_id` (`winner_team_id`)
) ENGINE=MyISAM AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `matches`
--

INSERT INTO `matches` (`id`, `bracket_id`, `round_number`, `match_number`, `team1_id`, `team2_id`, `match_date`, `venue`, `team1_score`, `team2_score`, `winner_team_id`, `status`, `created_at`, `updated_at`) VALUES
(100, 32, 2, 1, 28, 27, NULL, NULL, 95, 100, 27, 'completed', '2025-10-09 22:53:00', '2025-10-09 22:53:06'),
(99, 32, 1, 2, 28, NULL, NULL, NULL, NULL, NULL, 28, 'completed', '2025-10-09 22:52:38', '2025-10-09 22:52:38'),
(98, 32, 1, 1, 29, 27, NULL, NULL, 95, 100, 27, 'completed', '2025-10-09 22:52:38', '2025-10-09 22:52:57');

-- --------------------------------------------------------

--
-- Table structure for table `posts`
--

DROP TABLE IF EXISTS `posts`;
CREATE TABLE IF NOT EXISTS `posts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `images` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `videos` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `caption` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `notification_viewed` tinyint(1) DEFAULT '0',
  `coach_notifViewed` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `posts`
--

INSERT INTO `posts` (`id`, `images`, `videos`, `caption`, `created_at`, `updated_at`, `notification_viewed`, `coach_notifViewed`) VALUES
(20, '[\"1760012408297-843004411.jpg\"]', '[]', 'CCAA 2025', '2025-10-09 12:20:08', '2025-10-09 12:56:27', 1, 1),
(21, '[\"1760012434024-788823244.jpg\"]', '[]', 'MAYOR\'S CUP 2025\r\n', '2025-10-09 12:20:34', '2025-10-09 12:52:59', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `post_reactions`
--

DROP TABLE IF EXISTS `post_reactions`;
CREATE TABLE IF NOT EXISTS `post_reactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `admin_id` int DEFAULT NULL,
  `coach_id` int DEFAULT NULL,
  `reaction_type` enum('like','dislike') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `post_id` (`post_id`),
  KEY `user_id` (`user_id`),
  KEY `admin_id` (`admin_id`),
  KEY `coach_id` (`coach_id`)
) ENGINE=InnoDB AUTO_INCREMENT=94 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `post_reactions`
--

INSERT INTO `post_reactions` (`id`, `post_id`, `user_id`, `admin_id`, `coach_id`, `reaction_type`, `created_at`) VALUES
(90, 20, NULL, 1, NULL, 'like', '2025-10-09 12:20:10'),
(91, 21, NULL, 1, NULL, 'like', '2025-10-09 12:20:39'),
(92, 21, NULL, NULL, 22, 'like', '2025-10-09 12:51:56'),
(93, 20, NULL, NULL, 22, 'like', '2025-10-09 12:51:58');

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int UNSIGNED NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`session_id`, `expires`, `data`) VALUES
('a4wZVtczND6ocrU4iQW9jNU6hEef-287', 1760138808, '{\"cookie\":{\"originalMaxAge\":86399997,\"expires\":\"2025-10-10T23:26:47.949Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\"},\"passport\":{\"user\":{\"id\":25,\"google_id\":\"116186537520761750975\"}},\"user\":{\"id\":25,\"email\":\"johnraycarpio1404@gmail.com\",\"password\":null,\"google_id\":\"116186537520761750975\",\"created_at\":\"2025-09-22T00:16:37.000Z\",\"updated_at\":\"2025-09-22T00:16:42.000Z\",\"profile\":null,\"terms_accepted\":1,\"terms_accepted_at\":\"2025-09-22T00:16:42.000Z\"},\"admin\":{\"id\":1,\"username\":\"admin\"},\"success\":null,\"error\":null,\"coachOnly\":{\"id\":25,\"email\":\"ccc@gmail.com\",\"fullname\":\"CCC\",\"status\":\"pending\"},\"flash\":{}}');

-- --------------------------------------------------------

--
-- Table structure for table `team`
--

DROP TABLE IF EXISTS `team`;
CREATE TABLE IF NOT EXISTS `team` (
  `id` int NOT NULL AUTO_INCREMENT,
  `teamName` varchar(199) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `teamProfile` varchar(199) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `appointment_form` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `organization` enum('school','barangay') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `coach_id` int DEFAULT NULL,
  `event_id` int DEFAULT NULL,
  `status` enum('pending','confirmed','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `notification_viewed` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `coach_id` (`coach_id`),
  KEY `event_id` (`event_id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `team`
--

INSERT INTO `team` (`id`, `teamName`, `teamProfile`, `appointment_form`, `organization`, `created_at`, `updated_at`, `coach_id`, `event_id`, `status`, `notification_viewed`) VALUES
(27, 'MINSU', '1760014654170.jpg', '1760014654169.pdf', 'school', '2025-10-09 12:57:34', '2025-10-09 12:57:44', 22, 15, 'confirmed', 0),
(28, 'LUNA GOCO', '1760014917593.jpg', '1760014917593.pdf', 'school', '2025-10-09 13:01:57', '2025-10-09 13:02:05', 23, 15, 'confirmed', 0),
(29, 'DIVINE COLLEGE', '1760015031375.jpg', '1760015031375.pdf', 'school', '2025-10-09 13:03:51', '2025-10-09 13:03:56', 24, 15, 'confirmed', 0),
(30, 'CCC', '1760015127455.png', '1760015127455.pdf', 'school', '2025-10-09 13:05:27', '2025-10-09 13:05:33', 25, 15, 'confirmed', 0);

-- --------------------------------------------------------

--
-- Table structure for table `team_players`
--

DROP TABLE IF EXISTS `team_players`;
CREATE TABLE IF NOT EXISTS `team_players` (
  `id` int NOT NULL AUTO_INCREMENT,
  `team_id` int NOT NULL,
  `PSA` varchar(199) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `waiver` varchar(199) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `med_cert` varchar(199) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` enum('pending','confirmed','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `sports` varchar(199) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `birthdate` date DEFAULT NULL,
  `age` int DEFAULT NULL,
  `sex` enum('male','female','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `player_name` varchar(199) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `school` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `year_level` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `barangay` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contact_number` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `notification_viewed` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `team_id` (`team_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tournament_brackets`
--

DROP TABLE IF EXISTS `tournament_brackets`;
CREATE TABLE IF NOT EXISTS `tournament_brackets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `sport_type` varchar(100) NOT NULL,
  `bracket_type` enum('single_elimination','double_elimination','round_robin') NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `event_id` (`event_id`)
) ENGINE=MyISAM AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `tournament_brackets`
--

INSERT INTO `tournament_brackets` (`id`, `event_id`, `sport_type`, `bracket_type`, `created_at`, `updated_at`) VALUES
(32, 15, 'basketball', 'single_elimination', '2025-10-09 22:52:38', '2025-10-09 22:52:38');

-- --------------------------------------------------------

--
-- Table structure for table `tournament_progress`
--

DROP TABLE IF EXISTS `tournament_progress`;
CREATE TABLE IF NOT EXISTS `tournament_progress` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bracket_id` int NOT NULL,
  `current_round` int DEFAULT '1',
  `is_completed` tinyint(1) DEFAULT '0',
  `champion_team_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `total_rounds` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bracket_id` (`bracket_id`),
  KEY `champion_team_id` (`champion_team_id`)
) ENGINE=MyISAM AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `tournament_progress`
--

INSERT INTO `tournament_progress` (`id`, `bracket_id`, `current_round`, `is_completed`, `champion_team_id`, `created_at`, `updated_at`, `total_rounds`) VALUES
(32, 32, 2, 1, 27, '2025-10-09 22:52:38', '2025-10-09 22:53:09', 2);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(199) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password` varchar(199) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `google_id` varchar(199) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `profile` varchar(199) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `terms_accepted` tinyint(1) DEFAULT '0',
  `terms_accepted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `google_id`, `created_at`, `updated_at`, `profile`, `terms_accepted`, `terms_accepted_at`) VALUES
(25, 'johnraycarpio1404@gmail.com', NULL, '116186537520761750975', '2025-09-22 08:16:37', '2025-09-22 08:16:42', NULL, 1, '2025-09-22 00:16:42');

--
-- Constraints for dumped tables
--

--
-- Constraints for table `post_reactions`
--
ALTER TABLE `post_reactions`
  ADD CONSTRAINT `post_reactions_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `post_reactions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `post_reactions_ibfk_3` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `post_reactions_ibfk_4` FOREIGN KEY (`coach_id`) REFERENCES `coach` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `team`
--
ALTER TABLE `team`
  ADD CONSTRAINT `team_ibfk_1` FOREIGN KEY (`coach_id`) REFERENCES `coach` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `team_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `team_players`
--
ALTER TABLE `team_players`
  ADD CONSTRAINT `team_players_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `team` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `team_players_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

DELIMITER $$
--
-- Events
--
DROP EVENT IF EXISTS `update_event_status`$$
CREATE DEFINER=`root`@`localhost` EVENT `update_event_status` ON SCHEDULE EVERY 1 DAY STARTS '2025-02-27 22:27:25' ON COMPLETION NOT PRESERVE ENABLE DO UPDATE events
    SET status = 'expired'
    WHERE date_schedule < NOW() AND status = 'ongoing'$$

DELIMITER ;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
