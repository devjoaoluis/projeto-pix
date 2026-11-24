CREATE TABLE "account_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_account_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'VIEWER' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"blocked_reason" varchar(255),
	"blocked_at" timestamp,
	"daily_limit" numeric(15, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"sms_enabled" boolean DEFAULT false NOT NULL,
	"email_enabled" boolean DEFAULT false NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"transaction_id" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"message" varchar(255) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"description" varchar(255),
	"channels" jsonb DEFAULT '["IN_APP"]'::jsonb NOT NULL,
	"notified_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pix_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_account_id" uuid NOT NULL,
	"key" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"suspended_reason" varchar(255),
	"suspended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pix_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_account_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"description" varchar(255),
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"pix_code" text,
	"sender_account_id" uuid,
	"receiver_account_id" uuid,
	"pix_key_id" uuid,
	"type" varchar(10) NOT NULL,
	"idempotency_key" varchar(255),
	"latitude" double precision,
	"longitude" double precision,
	"scheduled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pix_transactions_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"total_transactions" integer DEFAULT 0 NOT NULL,
	"total_sent" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_received" numeric(15, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"description" varchar(255) NOT NULL,
	"ip_address" varchar(45),
	"device" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"nickname" varchar(100),
	"phone" varchar(20),
	"email" varchar(255),
	"cpf" varchar(14),
	"pix_key" varchar(255) NOT NULL,
	"pix_key_type" varchar(20) NOT NULL,
	"pix_key_id" uuid,
	"contact_bank_account_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"cpf" varchar(14) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"password_hash" varchar(255),
	"role" varchar(20) DEFAULT 'USER' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_cpf_unique" UNIQUE("cpf")
);
--> statement-breakpoint
ALTER TABLE "account_permissions" ADD CONSTRAINT "account_permissions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_permissions" ADD CONSTRAINT "account_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_account_id_bank_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_account_id_bank_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pix_keys" ADD CONSTRAINT "pix_keys_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pix_transactions" ADD CONSTRAINT "pix_transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pix_transactions" ADD CONSTRAINT "pix_transactions_sender_account_id_bank_accounts_id_fk" FOREIGN KEY ("sender_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pix_transactions" ADD CONSTRAINT "pix_transactions_receiver_account_id_bank_accounts_id_fk" FOREIGN KEY ("receiver_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pix_transactions" ADD CONSTRAINT "pix_transactions_pix_key_id_pix_keys_id_fk" FOREIGN KEY ("pix_key_id") REFERENCES "public"."pix_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_logs" ADD CONSTRAINT "user_activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_contacts" ADD CONSTRAINT "user_contacts_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_contacts" ADD CONSTRAINT "user_contacts_pix_key_id_pix_keys_id_fk" FOREIGN KEY ("pix_key_id") REFERENCES "public"."pix_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_contacts" ADD CONSTRAINT "user_contacts_contact_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("contact_bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_permissions_account_user_unique" ON "account_permissions" USING btree ("bank_account_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bank_accounts_user_id_unique" ON "bank_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preferences_account_id_unique" ON "notification_preferences" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "notifications_account_notified_at_idx" ON "notifications" USING btree ("account_id","notified_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pix_key_unique" ON "pix_keys" USING btree ("key");--> statement-breakpoint
CREATE INDEX "pix_tx_sender_created_at_idx" ON "pix_transactions" USING btree ("sender_account_id","created_at");--> statement-breakpoint
CREATE INDEX "pix_tx_receiver_created_at_idx" ON "pix_transactions" USING btree ("receiver_account_id","created_at");--> statement-breakpoint
CREATE INDEX "pix_tx_status_scheduled_at_idx" ON "pix_transactions" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "user_activity_logs_user_created_at_idx" ON "user_activity_logs" USING btree ("user_id","created_at");