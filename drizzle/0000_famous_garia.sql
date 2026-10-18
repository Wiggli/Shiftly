CREATE TABLE `calendars` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`timezone` text NOT NULL,
	`settings` text DEFAULT '{}' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sharing_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`calendar_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`expires` text NOT NULL,
	`revoked` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`calendar_id`) REFERENCES `calendars`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `calendar_members` (
	`id` text PRIMARY KEY NOT NULL,
	`calendar_id` text NOT NULL,
	`user` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	FOREIGN KEY (`calendar_id`) REFERENCES `calendars`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `member_access` ON `calendar_members` (`calendar_id`,`user`);--> statement-breakpoint
CREATE TABLE `operations` (
	`id` text PRIMARY KEY NOT NULL,
	`calendar_id` text NOT NULL,
	`author` text NOT NULL,
	`at` text NOT NULL,
	`summary` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `calendar_records` (
	`id` text PRIMARY KEY NOT NULL,
	`calendar_id` text NOT NULL,
	`kind` text NOT NULL,
	`date` text,
	`author` text NOT NULL,
	`private` integer DEFAULT 0 NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`calendar_id`) REFERENCES `calendars`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `records_month` ON `calendar_records` (`calendar_id`,`kind`,`date`);