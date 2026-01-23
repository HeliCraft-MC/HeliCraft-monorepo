CREATE TABLE `litebans_bans` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`uuid` varchar(36),
	`ip` varchar(45),
	`reason` varchar(2048),
	`banned_by_uuid` varchar(36) NOT NULL,
	`banned_by_name` varchar(128),
	`removed_by_uuid` varchar(36),
	`removed_by_name` varchar(128),
	`removed_by_reason` varchar(2048),
	`removed_by_date` bigint NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`time` bigint NOT NULL,
	`until` bigint NOT NULL,
	`template` tinyint unsigned NOT NULL DEFAULT 255,
	`server_scope` varchar(32),
	`server_origin` varchar(32),
	`silent` tinyint NOT NULL DEFAULT 0,
	`ipban` tinyint NOT NULL DEFAULT 0,
	`ipban_wildcard` tinyint NOT NULL DEFAULT 0,
	`active` tinyint NOT NULL DEFAULT 1,
	CONSTRAINT `litebans_bans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `AUTH` (
	`NICKNAME` varchar(255) NOT NULL,
	`LOWERCASENICKNAME` varchar(255) NOT NULL,
	`HASH` varchar(255) NOT NULL,
	`IP` varchar(255),
	`isAdmin` tinyint NOT NULL DEFAULT 0,
	`TOTPTOKEN` varchar(255),
	`REGDATE` bigint,
	`UUID` varchar(255),
	`UUID_WR` varchar(255),
	`PREMIUMUUID` varchar(255),
	`LOGINIP` varchar(255),
	`LOGINDATE` bigint,
	`ISSUEDTIME` bigint,
	`accessToken` char(32),
	`serverID` varchar(41),
	`hwidId` bigint,
	CONSTRAINT `AUTH_LOWERCASENICKNAME` PRIMARY KEY(`LOWERCASENICKNAME`),
	CONSTRAINT `UUID_WR` UNIQUE(`UUID_WR`)
);
--> statement-breakpoint
CREATE TABLE `answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`response_id` int NOT NULL,
	`question_id` int NOT NULL,
	`value` text,
	CONSTRAINT `answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `forms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uuid` varchar(36) NOT NULL,
	`owner_uuid` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('draft','published','closed','archived') NOT NULL DEFAULT 'draft',
	`theme` json,
	`settings` json,
	`public_hash` varchar(64),
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `forms_id` PRIMARY KEY(`id`),
	CONSTRAINT `forms_uuid_unique` UNIQUE(`uuid`),
	CONSTRAINT `forms_public_hash_unique` UNIQUE(`public_hash`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`form_id` int NOT NULL,
	`uuid` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`is_required` boolean NOT NULL DEFAULT false,
	`options` json,
	`validation` json,
	`order_index` int NOT NULL DEFAULT 0,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`),
	CONSTRAINT `questions_uuid_unique` UNIQUE(`uuid`)
);
--> statement-breakpoint
CREATE TABLE `responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`form_id` int NOT NULL,
	`respondent_uuid` varchar(36) NOT NULL,
	`submitted_at` bigint NOT NULL,
	CONSTRAINT `responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `answers` ADD CONSTRAINT `answers_response_id_responses_id_fk` FOREIGN KEY (`response_id`) REFERENCES `responses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `answers` ADD CONSTRAINT `answers_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_form_id_forms_id_fk` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `responses` ADD CONSTRAINT `responses_form_id_forms_id_fk` FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_litebans_bans_uuid` ON `litebans_bans` (`uuid`);--> statement-breakpoint
CREATE INDEX `idx_litebans_bans_ip` ON `litebans_bans` (`ip`);--> statement-breakpoint
CREATE INDEX `idx_litebans_bans_banned_by_uuid` ON `litebans_bans` (`banned_by_uuid`);--> statement-breakpoint
CREATE INDEX `idx_litebans_bans_time` ON `litebans_bans` (`time`);--> statement-breakpoint
CREATE INDEX `idx_litebans_bans_until` ON `litebans_bans` (`until`);--> statement-breakpoint
CREATE INDEX `idx_litebans_bans_template` ON `litebans_bans` (`template`);--> statement-breakpoint
CREATE INDEX `idx_litebans_bans_ipban` ON `litebans_bans` (`ipban`);--> statement-breakpoint
CREATE INDEX `idx_litebans_bans_ipban_wildcard` ON `litebans_bans` (`ipban_wildcard`);--> statement-breakpoint
CREATE INDEX `idx_litebans_bans_active` ON `litebans_bans` (`active`);--> statement-breakpoint
CREATE INDEX `AUTH_PREMIUMUUID_idx` ON `AUTH` (`PREMIUMUUID`);--> statement-breakpoint
CREATE INDEX `AUTH_IP_idx` ON `AUTH` (`IP`);--> statement-breakpoint
CREATE INDEX `answers_response_id_idx` ON `answers` (`response_id`);--> statement-breakpoint
CREATE INDEX `answers_question_id_idx` ON `answers` (`question_id`);--> statement-breakpoint
CREATE INDEX `questions_form_id_idx` ON `questions` (`form_id`);--> statement-breakpoint
CREATE INDEX `responses_form_id_idx` ON `responses` (`form_id`);