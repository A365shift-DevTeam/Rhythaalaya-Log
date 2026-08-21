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
COMMIT;

