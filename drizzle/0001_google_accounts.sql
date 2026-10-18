CREATE TABLE `auth_login_flows` (
	`id` text PRIMARY KEY NOT NULL,
	`return_path` text NOT NULL,
	`legacy_principal` text,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `login_flow_expiry` ON `auth_login_flows` (`expires_at`);--> statement-breakpoint
CREATE TABLE `identity_links` (
	`google_user_id` text PRIMARY KEY NOT NULL,
	`principal` text NOT NULL,
	`linked_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `identity_links_principal_unique` ON `identity_links` (`principal`);