CREATE TABLE IF NOT EXISTS `forms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `owner_uuid` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  `theme` JSON, -- Color, background image, etc.
  `settings` JSON, -- Access rules, limits, etc.
  `public_hash` VARCHAR(64) UNIQUE,
  `created_at` BIGINT NOT NULL,
  `updated_at` BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `questions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `form_id` INT NOT NULL,
  `uuid` VARCHAR(36) NOT NULL UNIQUE,
  `type` VARCHAR(50) NOT NULL, -- Extensible type system (not ENUM)
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `is_required` BOOLEAN NOT NULL DEFAULT 0,
  `options` JSON, -- For choice/checkbox/dropdown/rating (min/max)
  `validation` JSON, -- Regex, min/max length, etc.
  `order_index` INT NOT NULL DEFAULT 0,
  `created_at` BIGINT NOT NULL,
  `updated_at` BIGINT NOT NULL,
  FOREIGN KEY (`form_id`) REFERENCES `forms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `responses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `form_id` INT NOT NULL,
  `respondent_uuid` VARCHAR(36) NOT NULL, -- User who answered
  `submitted_at` BIGINT NOT NULL,
  FOREIGN KEY (`form_id`) REFERENCES `forms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `answers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `response_id` INT NOT NULL,
  `question_id` INT NOT NULL,
  `value` TEXT, -- Stores text, JSON array for checkboxes, or file path
  FOREIGN KEY (`response_id`) REFERENCES `responses` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
