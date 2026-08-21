CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812110850_InitialCreate') THEN
    CREATE TABLE "Batches" (
        "Id" uuid NOT NULL,
        "Name" character varying(160) NOT NULL,
        "Course" character varying(120) NOT NULL,
        "Schedule" character varying(160) NOT NULL,
        "Instructor" character varying(120) NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Batches" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812110850_InitialCreate') THEN
    CREATE TABLE "OrganizationSettings" (
        "Id" uuid NOT NULL,
        "Name" text NOT NULL,
        "Type" text NOT NULL,
        "LogoUrl" text,
        "ThemeColor" text NOT NULL,
        "DarkMode" boolean NOT NULL,
        "DefaultMonthlyFee" numeric(12,2) NOT NULL,
        "FeeDueDay" integer NOT NULL,
        "Currency" text NOT NULL,
        "Locale" text NOT NULL,
        "TimeZone" text NOT NULL,
        CONSTRAINT "PK_OrganizationSettings" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812110850_InitialCreate') THEN
    CREATE TABLE "Students" (
        "Id" uuid NOT NULL,
        "StudentNumber" character varying(32) NOT NULL,
        "Name" character varying(160) NOT NULL,
        "BatchId" uuid NOT NULL,
        "MonthlyFee" numeric(12,2) NOT NULL,
        "OutstandingBalance" numeric(12,2) NOT NULL,
        "Phone" character varying(32),
        "Email" character varying(254),
        "JoinDate" date NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Students" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Students_Batches_BatchId" FOREIGN KEY ("BatchId") REFERENCES "Batches" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812110850_InitialCreate') THEN
    CREATE TABLE "AttendanceRecords" (
        "Id" uuid NOT NULL,
        "Date" date NOT NULL,
        "BatchId" uuid NOT NULL,
        "StudentId" uuid NOT NULL,
        "Status" character varying(16) NOT NULL,
        "SubmittedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_AttendanceRecords" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_AttendanceRecords_Batches_BatchId" FOREIGN KEY ("BatchId") REFERENCES "Batches" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_AttendanceRecords_Students_StudentId" FOREIGN KEY ("StudentId") REFERENCES "Students" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812110850_InitialCreate') THEN
    CREATE TABLE "Payments" (
        "Id" uuid NOT NULL,
        "StudentId" uuid NOT NULL,
        "Amount" numeric(12,2) NOT NULL,
        "Method" character varying(32) NOT NULL,
        "Reference" character varying(120),
        "OccurredAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Payments" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Payments_Students_StudentId" FOREIGN KEY ("StudentId") REFERENCES "Students" ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812110850_InitialCreate') THEN
    CREATE TABLE "Transactions" (
        "Id" uuid NOT NULL,
        "Title" character varying(200) NOT NULL,
        "Type" character varying(16) NOT NULL,
        "Amount" numeric(12,2) NOT NULL,
        "Category" character varying(80) NOT NULL,
        "OccurredAt" timestamp with time zone NOT NULL,
        "PaymentId" uuid,
        CONSTRAINT "PK_Transactions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Transactions_Payments_PaymentId" FOREIGN KEY ("PaymentId") REFERENCES "Payments" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812110850_InitialCreate') THEN
    CREATE INDEX "IX_AttendanceRecords_BatchId" ON "AttendanceRecords" ("BatchId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812110850_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_AttendanceRecords_Date_BatchId_StudentId" ON "AttendanceRecords" ("Date", "BatchId", "StudentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812110850_InitialCreate') THEN
    CREATE INDEX "IX_AttendanceRecords_StudentId" ON "AttendanceRecords" ("StudentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812110850_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Batches_Name" ON "Batches" ("Name");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812110850_InitialCreate') THEN
    CREATE INDEX "IX_Payments_StudentId" ON "Payments" ("StudentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812110850_InitialCreate') THEN
    CREATE INDEX "IX_Students_BatchId" ON "Students" ("BatchId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812110850_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Students_StudentNumber" ON "Students" ("StudentNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812110850_InitialCreate') THEN
    CREATE INDEX "IX_Transactions_OccurredAt" ON "Transactions" ("OccurredAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812110850_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Transactions_PaymentId" ON "Transactions" ("PaymentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812110850_InitialCreate') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260812110850_InitialCreate', '9.0.1');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    DROP INDEX "IX_Students_StudentNumber";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    DROP INDEX "IX_Batches_Name";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    DROP INDEX "IX_AttendanceRecords_Date_BatchId_StudentId";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    ALTER TABLE "Transactions" ADD "TenantId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    ALTER TABLE "Students" ADD "TenantId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    ALTER TABLE "Payments" ADD "TenantId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    ALTER TABLE "OrganizationSettings" ADD "TenantId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    ALTER TABLE "Batches" ADD "TenantId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    ALTER TABLE "AttendanceRecords" ADD "TenantId" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    CREATE TABLE "SubscriptionPlans" (
        "Id" uuid NOT NULL,
        "Name" character varying(120) NOT NULL,
        "Code" character varying(50) NOT NULL,
        "MonthlyPrice" numeric(12,2) NOT NULL,
        "MaxUsers" integer NOT NULL,
        "MaxStudents" integer NOT NULL,
        "IsActive" boolean NOT NULL,
        CONSTRAINT "PK_SubscriptionPlans" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    CREATE TABLE "Tenants" (
        "Id" uuid NOT NULL,
        "Name" character varying(160) NOT NULL,
        "Slug" character varying(80) NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Tenants" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    CREATE TABLE "TenantSubscriptions" (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "PlanId" uuid NOT NULL,
        "Status" character varying(32) NOT NULL,
        "StartsAt" timestamp with time zone NOT NULL,
        "EndsAt" timestamp with time zone NOT NULL,
        "CancelledAt" timestamp with time zone,
        CONSTRAINT "PK_TenantSubscriptions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_TenantSubscriptions_SubscriptionPlans_PlanId" FOREIGN KEY ("PlanId") REFERENCES "SubscriptionPlans" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_TenantSubscriptions_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    CREATE TABLE "Users" (
        "Id" uuid NOT NULL,
        "TenantId" uuid,
        "Email" character varying(254) NOT NULL,
        "PasswordHash" character varying(500) NOT NULL,
        "FullName" character varying(160) NOT NULL,
        "Role" character varying(32) NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Users" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Users_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    INSERT INTO "Tenants" ("Id", "CreatedAt", "IsActive", "Name", "Slug")
    SELECT '00000000-0000-0000-0000-000000000000', TIMESTAMPTZ '2026-08-12T00:00:00Z',
           TRUE, 'Legacy Academy', 'legacy-academy'
    WHERE EXISTS (
        SELECT 1 FROM "Batches"
        UNION ALL SELECT 1 FROM "Students"
        UNION ALL SELECT 1 FROM "OrganizationSettings"
        LIMIT 1
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    INSERT INTO "SubscriptionPlans"
        ("Id", "Code", "IsActive", "MaxStudents", "MaxUsers", "MonthlyPrice", "Name")
    SELECT '11111111-1111-1111-1111-111111111111', 'LEGACY', TRUE, 10000, 100, 0, 'Legacy Plan'
    WHERE EXISTS (SELECT 1 FROM "Tenants"
        WHERE "Id" = '00000000-0000-0000-0000-000000000000');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    INSERT INTO "TenantSubscriptions"
        ("Id", "CancelledAt", "EndsAt", "PlanId", "StartsAt", "Status", "TenantId")
    SELECT '22222222-2222-2222-2222-222222222222', NULL,
           TIMESTAMPTZ '2099-12-31T00:00:00Z',
           '11111111-1111-1111-1111-111111111111',
           TIMESTAMPTZ '2026-08-12T00:00:00Z', 'Active',
           '00000000-0000-0000-0000-000000000000'
    WHERE EXISTS (SELECT 1 FROM "Tenants"
        WHERE "Id" = '00000000-0000-0000-0000-000000000000');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    CREATE INDEX "IX_Transactions_TenantId" ON "Transactions" ("TenantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    CREATE UNIQUE INDEX "IX_Students_TenantId_StudentNumber" ON "Students" ("TenantId", "StudentNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    CREATE INDEX "IX_Payments_TenantId" ON "Payments" ("TenantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    CREATE UNIQUE INDEX "IX_OrganizationSettings_TenantId" ON "OrganizationSettings" ("TenantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    CREATE UNIQUE INDEX "IX_Batches_TenantId_Name" ON "Batches" ("TenantId", "Name");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    CREATE UNIQUE INDEX "IX_AttendanceRecords_TenantId_Date_BatchId_StudentId" ON "AttendanceRecords" ("TenantId", "Date", "BatchId", "StudentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    CREATE UNIQUE INDEX "IX_SubscriptionPlans_Code" ON "SubscriptionPlans" ("Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    CREATE UNIQUE INDEX "IX_Tenants_Slug" ON "Tenants" ("Slug");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    CREATE INDEX "IX_TenantSubscriptions_PlanId" ON "TenantSubscriptions" ("PlanId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    CREATE INDEX "IX_TenantSubscriptions_TenantId_Status" ON "TenantSubscriptions" ("TenantId", "Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    CREATE UNIQUE INDEX "IX_Users_Email" ON "Users" ("Email");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    CREATE INDEX "IX_Users_TenantId" ON "Users" ("TenantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    ALTER TABLE "AttendanceRecords" ADD CONSTRAINT "FK_AttendanceRecords_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    ALTER TABLE "Batches" ADD CONSTRAINT "FK_Batches_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    ALTER TABLE "OrganizationSettings" ADD CONSTRAINT "FK_OrganizationSettings_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    ALTER TABLE "Payments" ADD CONSTRAINT "FK_Payments_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    ALTER TABLE "Students" ADD CONSTRAINT "FK_Students_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    ALTER TABLE "Transactions" ADD CONSTRAINT "FK_Transactions_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260812113719_AddMultiTenantSubscriptions') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260812113719_AddMultiTenantSubscriptions', '9.0.1');
    END IF;
END $EF$;
COMMIT;

