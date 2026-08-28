CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
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
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
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
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE TABLE "Courses" (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "Name" character varying(160) NOT NULL,
        "Description" character varying(1000),
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Courses" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Courses_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE TABLE "OrganizationSettings" (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "Name" text NOT NULL,
        "Type" text NOT NULL,
        "LogoUrl" text,
        "ThemeColor" text NOT NULL,
        "DarkMode" boolean NOT NULL,
        "Currency" text NOT NULL,
        "Locale" text NOT NULL,
        "TimeZone" text NOT NULL,
        "ReceiptPrefix" character varying(16) NOT NULL,
        "NextReceiptNumber" integer NOT NULL,
        "ReceiptAddress" character varying(300),
        "ReceiptPhone" character varying(32),
        "ReceiptEmail" character varying(254),
        "ReceiptFooter" character varying(300) NOT NULL,
        "ReceiptShowLogo" boolean NOT NULL,
        "ReceiptShowSignature" boolean NOT NULL,
        "ReceiptAutoOpen" boolean NOT NULL,
        "IncomeCategoriesJson" text NOT NULL,
        "ExpenseCategoriesJson" text NOT NULL,
        "NotificationsEnabled" boolean NOT NULL,
        "FeeReminderNotifications" boolean NOT NULL,
        "PaymentNotifications" boolean NOT NULL,
        "AttendanceNotifications" boolean NOT NULL,
        CONSTRAINT "PK_OrganizationSettings" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_OrganizationSettings_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE TABLE "Staff" (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "Name" character varying(160) NOT NULL,
        "Phone" character varying(32),
        "Email" character varying(254),
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Staff" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Staff_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE TABLE "Students" (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "StudentNumber" character varying(32) NOT NULL,
        "Name" character varying(160) NOT NULL,
        "DateOfBirth" date,
        "ParentName" character varying(160),
        "Address" character varying(400),
        "Phone" character varying(32),
        "Email" character varying(254),
        "JoinDate" date NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Students" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Students_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
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
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
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
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE TABLE "FeeStructures" (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "CourseId" uuid NOT NULL,
        "Name" character varying(160) NOT NULL,
        "Amount" numeric(12,2) NOT NULL,
        "Frequency" character varying(16) NOT NULL,
        "EffectiveFrom" date NOT NULL,
        "EffectiveTo" date,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_FeeStructures" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_FeeStructures_Courses_CourseId" FOREIGN KEY ("CourseId") REFERENCES "Courses" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_FeeStructures_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE TABLE "Batches" (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "Name" character varying(160) NOT NULL,
        "CourseId" uuid NOT NULL,
        "StaffId" uuid NOT NULL,
        "Days" integer NOT NULL,
        "StartTime" time without time zone NOT NULL,
        "EndTime" time without time zone NOT NULL,
        "StartDate" date NOT NULL,
        "EndDate" date,
        "IsActive" boolean NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Batches" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Batches_Courses_CourseId" FOREIGN KEY ("CourseId") REFERENCES "Courses" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_Batches_Staff_StaffId" FOREIGN KEY ("StaffId") REFERENCES "Staff" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_Batches_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE TABLE "FeePayments" (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "StudentId" uuid NOT NULL,
        "ReceiptNumber" character varying(32) NOT NULL,
        "Amount" numeric(12,2) NOT NULL,
        "PaymentDate" timestamp with time zone NOT NULL,
        "Method" character varying(32) NOT NULL,
        "ReferenceNumber" character varying(120),
        "CollectedByUserId" uuid NOT NULL,
        "Remarks" character varying(500),
        "RefundOfPaymentId" uuid,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_FeePayments" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_FeePayments_FeePayments_RefundOfPaymentId" FOREIGN KEY ("RefundOfPaymentId") REFERENCES "FeePayments" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_FeePayments_Students_StudentId" FOREIGN KEY ("StudentId") REFERENCES "Students" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_FeePayments_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE TABLE "Enrollments" (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "StudentId" uuid NOT NULL,
        "BatchId" uuid NOT NULL,
        "CourseId" uuid NOT NULL,
        "EnrolledOn" date NOT NULL,
        "EndedOn" date,
        "Status" character varying(16) NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_Enrollments" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Enrollments_Batches_BatchId" FOREIGN KEY ("BatchId") REFERENCES "Batches" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_Enrollments_Courses_CourseId" FOREIGN KEY ("CourseId") REFERENCES "Courses" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_Enrollments_Students_StudentId" FOREIGN KEY ("StudentId") REFERENCES "Students" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_Enrollments_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE TABLE "Transactions" (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "Title" character varying(200) NOT NULL,
        "Type" character varying(16) NOT NULL,
        "Amount" numeric(12,2) NOT NULL,
        "Category" character varying(80) NOT NULL,
        "OccurredAt" timestamp with time zone NOT NULL,
        "FeePaymentId" uuid,
        CONSTRAINT "PK_Transactions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_Transactions_FeePayments_FeePaymentId" FOREIGN KEY ("FeePaymentId") REFERENCES "FeePayments" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_Transactions_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE TABLE "AttendanceRecords" (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "Date" date NOT NULL,
        "EnrollmentId" uuid NOT NULL,
        "Status" character varying(16) NOT NULL,
        "SubmittedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_AttendanceRecords" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_AttendanceRecords_Enrollments_EnrollmentId" FOREIGN KEY ("EnrollmentId") REFERENCES "Enrollments" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_AttendanceRecords_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE TABLE "FeeDues" (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "StudentId" uuid NOT NULL,
        "EnrollmentId" uuid NOT NULL,
        "FeeStructureId" uuid NOT NULL,
        "DueDate" date NOT NULL,
        "Amount" numeric(12,2) NOT NULL,
        "DiscountAmount" numeric(12,2) NOT NULL,
        "NetAmount" numeric(12,2) NOT NULL,
        "Status" character varying(16) NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_FeeDues" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_FeeDues_Enrollments_EnrollmentId" FOREIGN KEY ("EnrollmentId") REFERENCES "Enrollments" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_FeeDues_FeeStructures_FeeStructureId" FOREIGN KEY ("FeeStructureId") REFERENCES "FeeStructures" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_FeeDues_Students_StudentId" FOREIGN KEY ("StudentId") REFERENCES "Students" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_FeeDues_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE TABLE "FeePaymentAllocations" (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "FeePaymentId" uuid NOT NULL,
        "FeeDueId" uuid NOT NULL,
        "Amount" numeric(12,2) NOT NULL,
        "ReversalOfAllocationId" uuid,
        "AllocatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_FeePaymentAllocations" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_FeePaymentAllocations_FeeDues_FeeDueId" FOREIGN KEY ("FeeDueId") REFERENCES "FeeDues" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_FeePaymentAllocations_FeePaymentAllocations_ReversalOfAlloc~" FOREIGN KEY ("ReversalOfAllocationId") REFERENCES "FeePaymentAllocations" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_FeePaymentAllocations_FeePayments_FeePaymentId" FOREIGN KEY ("FeePaymentId") REFERENCES "FeePayments" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_FeePaymentAllocations_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_AttendanceRecords_EnrollmentId" ON "AttendanceRecords" ("EnrollmentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_AttendanceRecords_TenantId_Date_EnrollmentId" ON "AttendanceRecords" ("TenantId", "Date", "EnrollmentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_Batches_CourseId" ON "Batches" ("CourseId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_Batches_StaffId" ON "Batches" ("StaffId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Batches_TenantId_CourseId_Name" ON "Batches" ("TenantId", "CourseId", "Name");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Courses_TenantId_Name" ON "Courses" ("TenantId", "Name");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_Enrollments_BatchId" ON "Enrollments" ("BatchId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_Enrollments_CourseId" ON "Enrollments" ("CourseId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_Enrollments_StudentId" ON "Enrollments" ("StudentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_Enrollments_TenantId_StudentId_BatchId_Status" ON "Enrollments" ("TenantId", "StudentId", "BatchId", "Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_FeeDues_EnrollmentId" ON "FeeDues" ("EnrollmentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_FeeDues_FeeStructureId" ON "FeeDues" ("FeeStructureId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_FeeDues_StudentId" ON "FeeDues" ("StudentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_FeeDues_TenantId_EnrollmentId_FeeStructureId_DueDate" ON "FeeDues" ("TenantId", "EnrollmentId", "FeeStructureId", "DueDate");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_FeePaymentAllocations_FeeDueId" ON "FeePaymentAllocations" ("FeeDueId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_FeePaymentAllocations_FeePaymentId" ON "FeePaymentAllocations" ("FeePaymentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_FeePaymentAllocations_ReversalOfAllocationId" ON "FeePaymentAllocations" ("ReversalOfAllocationId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_FeePaymentAllocations_TenantId_FeeDueId" ON "FeePaymentAllocations" ("TenantId", "FeeDueId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_FeePayments_RefundOfPaymentId" ON "FeePayments" ("RefundOfPaymentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_FeePayments_StudentId" ON "FeePayments" ("StudentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_FeePayments_TenantId_ReceiptNumber" ON "FeePayments" ("TenantId", "ReceiptNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_FeeStructures_CourseId" ON "FeeStructures" ("CourseId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_FeeStructures_TenantId_CourseId_IsActive" ON "FeeStructures" ("TenantId", "CourseId", "IsActive");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_OrganizationSettings_TenantId" ON "OrganizationSettings" ("TenantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_Staff_TenantId" ON "Staff" ("TenantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Students_TenantId_StudentNumber" ON "Students" ("TenantId", "StudentNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_SubscriptionPlans_Code" ON "SubscriptionPlans" ("Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Tenants_Slug" ON "Tenants" ("Slug");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_TenantSubscriptions_PlanId" ON "TenantSubscriptions" ("PlanId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_TenantSubscriptions_TenantId_Status" ON "TenantSubscriptions" ("TenantId", "Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Transactions_FeePaymentId" ON "Transactions" ("FeePaymentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_Transactions_OccurredAt" ON "Transactions" ("OccurredAt");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_Transactions_TenantId" ON "Transactions" ("TenantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_Users_Email" ON "Users" ("Email");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    CREATE INDEX "IX_Users_TenantId" ON "Users" ("TenantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260821104928_InitialCreate') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260821104928_InitialCreate', '9.0.1');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260824072747_AddStudentAchievements') THEN
    CREATE TABLE "StudentAchievements" (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "StudentId" uuid NOT NULL,
        "Title" character varying(200) NOT NULL,
        "Category" character varying(16) NOT NULL,
        "Level" character varying(80),
        "EventDate" date NOT NULL,
        "Note" character varying(1000),
        "FileName" character varying(260) NOT NULL,
        "ContentType" character varying(100) NOT NULL,
        "FileData" bytea NOT NULL,
        "FileSizeBytes" integer NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_StudentAchievements" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_StudentAchievements_Students_StudentId" FOREIGN KEY ("StudentId") REFERENCES "Students" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_StudentAchievements_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260824072747_AddStudentAchievements') THEN
    CREATE INDEX "IX_StudentAchievements_StudentId" ON "StudentAchievements" ("StudentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260824072747_AddStudentAchievements') THEN
    CREATE INDEX "IX_StudentAchievements_TenantId_StudentId" ON "StudentAchievements" ("TenantId", "StudentId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260824072747_AddStudentAchievements') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260824072747_AddStudentAchievements', '9.0.1');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260825055854_FeeManagementCompletion') THEN
    ALTER TABLE "OrganizationSettings" ADD "FeeDueLeadDays" integer NOT NULL DEFAULT 7;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260825055854_FeeManagementCompletion') THEN
    ALTER TABLE "OrganizationSettings" ADD "LastBillingRunDate" date;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260825055854_FeeManagementCompletion') THEN
    ALTER TABLE "OrganizationSettings" ADD "LateEnrollmentBillingPolicy" character varying(16) NOT NULL DEFAULT 'Skip';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260825055854_FeeManagementCompletion') THEN
    ALTER TABLE "FeePayments" ADD "IdempotencyKey" character varying(64);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260825055854_FeeManagementCompletion') THEN
    ALTER TABLE "FeePayments" ADD "RequestHash" character varying(64);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260825055854_FeeManagementCompletion') THEN
    ALTER TABLE "FeeDues" ALTER COLUMN "FeeStructureId" DROP NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260825055854_FeeManagementCompletion') THEN
    ALTER TABLE "FeeDues" ADD "CancelReason" character varying(500);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260825055854_FeeManagementCompletion') THEN
    ALTER TABLE "FeeDues" ADD "CancelledAt" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260825055854_FeeManagementCompletion') THEN
    ALTER TABLE "FeeDues" ADD "CancelledByUserId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260825055854_FeeManagementCompletion') THEN
    ALTER TABLE "FeeDues" ADD "Title" character varying(160);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260825055854_FeeManagementCompletion') THEN
    CREATE TABLE "FeeAdjustments" (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "FeeDueId" uuid NOT NULL,
        "Type" character varying(16) NOT NULL,
        "Amount" numeric(12,2) NOT NULL,
        "Reason" character varying(500) NOT NULL,
        "PerformedByUserId" uuid,
        "CreatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_FeeAdjustments" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_FeeAdjustments_FeeDues_FeeDueId" FOREIGN KEY ("FeeDueId") REFERENCES "FeeDues" ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_FeeAdjustments_Tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES "Tenants" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260825055854_FeeManagementCompletion') THEN
    CREATE UNIQUE INDEX "IX_FeePayments_TenantId_IdempotencyKey" ON "FeePayments" ("TenantId", "IdempotencyKey") WHERE "IdempotencyKey" IS NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260825055854_FeeManagementCompletion') THEN
    CREATE INDEX "IX_FeeAdjustments_FeeDueId" ON "FeeAdjustments" ("FeeDueId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260825055854_FeeManagementCompletion') THEN
    CREATE INDEX "IX_FeeAdjustments_TenantId_FeeDueId" ON "FeeAdjustments" ("TenantId", "FeeDueId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260825055854_FeeManagementCompletion') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260825055854_FeeManagementCompletion', '9.0.1');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260825111342_StudentConcession') THEN
    ALTER TABLE "Students" ADD "ConcessionPercent" numeric(5,2) NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260825111342_StudentConcession') THEN
    ALTER TABLE "Students" ADD "ConcessionReason" character varying(200);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260825111342_StudentConcession') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260825111342_StudentConcession', '9.0.1');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260826120000_WhatsappTemplate') THEN
    ALTER TABLE "OrganizationSettings" ADD "WhatsappTemplate" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260826120000_WhatsappTemplate') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260826120000_WhatsappTemplate', '9.0.1');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827051527_LoginOtp') THEN
    CREATE TABLE "LoginOtps" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "PendingToken" character varying(64) NOT NULL,
        "CodeHash" character varying(128) NOT NULL,
        "ExpiresAt" timestamp with time zone NOT NULL,
        "Attempts" integer NOT NULL,
        "SendCount" integer NOT NULL,
        "LastSentAt" timestamp with time zone NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "ConsumedAt" timestamp with time zone,
        CONSTRAINT "PK_LoginOtps" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_LoginOtps_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827051527_LoginOtp') THEN
    CREATE UNIQUE INDEX "IX_LoginOtps_PendingToken" ON "LoginOtps" ("PendingToken");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827051527_LoginOtp') THEN
    CREATE INDEX "IX_LoginOtps_UserId" ON "LoginOtps" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827051527_LoginOtp') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260827051527_LoginOtp', '9.0.1');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827054728_UserOtpEnabled') THEN
    ALTER TABLE "Users" ADD "OtpEnabled" boolean NOT NULL DEFAULT TRUE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827054728_UserOtpEnabled') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260827054728_UserOtpEnabled', '9.0.1');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827075215_UserLastLoginAt') THEN
    ALTER TABLE "Users" ADD "LastLoginAt" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260827075215_UserLastLoginAt') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260827075215_UserLastLoginAt', '9.0.1');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260828065034_EnrollmentLateBillingPolicy') THEN
    ALTER TABLE "Enrollments" ADD "LateBillingPolicy" character varying(16);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260828065034_EnrollmentLateBillingPolicy') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260828065034_EnrollmentLateBillingPolicy', '9.0.1');
    END IF;
END $EF$;
COMMIT;

