using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RhythaalayaLog.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiTenantSubscriptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Students_StudentNumber",
                table: "Students");

            migrationBuilder.DropIndex(
                name: "IX_Batches_Name",
                table: "Batches");

            migrationBuilder.DropIndex(
                name: "IX_AttendanceRecords_Date_BatchId_StudentId",
                table: "AttendanceRecords");

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Transactions",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Students",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Payments",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "OrganizationSettings",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Batches",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "AttendanceRecords",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "SubscriptionPlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    MonthlyPrice = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    MaxUsers = table.Column<int>(type: "integer", nullable: false),
                    MaxStudents = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubscriptionPlans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Tenants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Slug = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tenants", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TenantSubscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    StartsAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndsAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CancelledAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantSubscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TenantSubscriptions_SubscriptionPlans_PlanId",
                        column: x => x.PlanId,
                        principalTable: "SubscriptionPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TenantSubscriptions_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: true),
                    Email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FullName = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Role = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Users_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    });

            // Only preserve a legacy tenant when the pre-SaaS schema contains data.
            migrationBuilder.Sql(
                """
                INSERT INTO "Tenants" ("Id", "CreatedAt", "IsActive", "Name", "Slug")
                SELECT '00000000-0000-0000-0000-000000000000', TIMESTAMPTZ '2026-08-12T00:00:00Z',
                       TRUE, 'Legacy Academy', 'legacy-academy'
                WHERE EXISTS (
                    SELECT 1 FROM "Batches"
                    UNION ALL SELECT 1 FROM "Students"
                    UNION ALL SELECT 1 FROM "OrganizationSettings"
                    LIMIT 1
                );
                """);
            migrationBuilder.Sql(
                """
                INSERT INTO "SubscriptionPlans"
                    ("Id", "Code", "IsActive", "MaxStudents", "MaxUsers", "MonthlyPrice", "Name")
                SELECT '11111111-1111-1111-1111-111111111111', 'LEGACY', TRUE, 10000, 100, 0, 'Legacy Plan'
                WHERE EXISTS (SELECT 1 FROM "Tenants"
                    WHERE "Id" = '00000000-0000-0000-0000-000000000000');
                """);
            migrationBuilder.Sql(
                """
                INSERT INTO "TenantSubscriptions"
                    ("Id", "CancelledAt", "EndsAt", "PlanId", "StartsAt", "Status", "TenantId")
                SELECT '22222222-2222-2222-2222-222222222222', NULL,
                       TIMESTAMPTZ '2099-12-31T00:00:00Z',
                       '11111111-1111-1111-1111-111111111111',
                       TIMESTAMPTZ '2026-08-12T00:00:00Z', 'Active',
                       '00000000-0000-0000-0000-000000000000'
                WHERE EXISTS (SELECT 1 FROM "Tenants"
                    WHERE "Id" = '00000000-0000-0000-0000-000000000000');
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_TenantId",
                table: "Transactions",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Students_TenantId_StudentNumber",
                table: "Students",
                columns: new[] { "TenantId", "StudentNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Payments_TenantId",
                table: "Payments",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationSettings_TenantId",
                table: "OrganizationSettings",
                column: "TenantId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Batches_TenantId_Name",
                table: "Batches",
                columns: new[] { "TenantId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceRecords_TenantId_Date_BatchId_StudentId",
                table: "AttendanceRecords",
                columns: new[] { "TenantId", "Date", "BatchId", "StudentId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionPlans_Code",
                table: "SubscriptionPlans",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tenants_Slug",
                table: "Tenants",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TenantSubscriptions_PlanId",
                table: "TenantSubscriptions",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_TenantSubscriptions_TenantId_Status",
                table: "TenantSubscriptions",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_TenantId",
                table: "Users",
                column: "TenantId");

            migrationBuilder.AddForeignKey(
                name: "FK_AttendanceRecords_Tenants_TenantId",
                table: "AttendanceRecords",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Batches_Tenants_TenantId",
                table: "Batches",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_OrganizationSettings_Tenants_TenantId",
                table: "OrganizationSettings",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Payments_Tenants_TenantId",
                table: "Payments",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Students_Tenants_TenantId",
                table: "Students",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_Tenants_TenantId",
                table: "Transactions",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AttendanceRecords_Tenants_TenantId",
                table: "AttendanceRecords");

            migrationBuilder.DropForeignKey(
                name: "FK_Batches_Tenants_TenantId",
                table: "Batches");

            migrationBuilder.DropForeignKey(
                name: "FK_OrganizationSettings_Tenants_TenantId",
                table: "OrganizationSettings");

            migrationBuilder.DropForeignKey(
                name: "FK_Payments_Tenants_TenantId",
                table: "Payments");

            migrationBuilder.DropForeignKey(
                name: "FK_Students_Tenants_TenantId",
                table: "Students");

            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_Tenants_TenantId",
                table: "Transactions");

            migrationBuilder.DropTable(
                name: "TenantSubscriptions");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "SubscriptionPlans");

            migrationBuilder.DropTable(
                name: "Tenants");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_TenantId",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Students_TenantId_StudentNumber",
                table: "Students");

            migrationBuilder.DropIndex(
                name: "IX_Payments_TenantId",
                table: "Payments");

            migrationBuilder.DropIndex(
                name: "IX_OrganizationSettings_TenantId",
                table: "OrganizationSettings");

            migrationBuilder.DropIndex(
                name: "IX_Batches_TenantId_Name",
                table: "Batches");

            migrationBuilder.DropIndex(
                name: "IX_AttendanceRecords_TenantId_Date_BatchId_StudentId",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "OrganizationSettings");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Batches");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "AttendanceRecords");

            migrationBuilder.CreateIndex(
                name: "IX_Students_StudentNumber",
                table: "Students",
                column: "StudentNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Batches_Name",
                table: "Batches",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceRecords_Date_BatchId_StudentId",
                table: "AttendanceRecords",
                columns: new[] { "Date", "BatchId", "StudentId" },
                unique: true);
        }
    }
}
