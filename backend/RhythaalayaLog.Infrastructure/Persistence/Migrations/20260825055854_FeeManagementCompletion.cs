using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RhythaalayaLog.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FeeManagementCompletion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // backfill existing tenants with the documented defaults (7 lead days, Skip policy)
            migrationBuilder.AddColumn<int>(
                name: "FeeDueLeadDays",
                table: "OrganizationSettings",
                type: "integer",
                nullable: false,
                defaultValue: 7);

            migrationBuilder.AddColumn<DateOnly>(
                name: "LastBillingRunDate",
                table: "OrganizationSettings",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LateEnrollmentBillingPolicy",
                table: "OrganizationSettings",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "Skip");

            migrationBuilder.AddColumn<string>(
                name: "IdempotencyKey",
                table: "FeePayments",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RequestHash",
                table: "FeePayments",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "FeeStructureId",
                table: "FeeDues",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<string>(
                name: "CancelReason",
                table: "FeeDues",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CancelledAt",
                table: "FeeDues",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CancelledByUserId",
                table: "FeeDues",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "FeeDues",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "FeeAdjustments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    FeeDueId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    PerformedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeeAdjustments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FeeAdjustments_FeeDues_FeeDueId",
                        column: x => x.FeeDueId,
                        principalTable: "FeeDues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FeeAdjustments_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FeePayments_TenantId_IdempotencyKey",
                table: "FeePayments",
                columns: new[] { "TenantId", "IdempotencyKey" },
                unique: true,
                filter: "\"IdempotencyKey\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_FeeAdjustments_FeeDueId",
                table: "FeeAdjustments",
                column: "FeeDueId");

            migrationBuilder.CreateIndex(
                name: "IX_FeeAdjustments_TenantId_FeeDueId",
                table: "FeeAdjustments",
                columns: new[] { "TenantId", "FeeDueId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FeeAdjustments");

            migrationBuilder.DropIndex(
                name: "IX_FeePayments_TenantId_IdempotencyKey",
                table: "FeePayments");

            migrationBuilder.DropColumn(
                name: "FeeDueLeadDays",
                table: "OrganizationSettings");

            migrationBuilder.DropColumn(
                name: "LastBillingRunDate",
                table: "OrganizationSettings");

            migrationBuilder.DropColumn(
                name: "LateEnrollmentBillingPolicy",
                table: "OrganizationSettings");

            migrationBuilder.DropColumn(
                name: "IdempotencyKey",
                table: "FeePayments");

            migrationBuilder.DropColumn(
                name: "RequestHash",
                table: "FeePayments");

            migrationBuilder.DropColumn(
                name: "CancelReason",
                table: "FeeDues");

            migrationBuilder.DropColumn(
                name: "CancelledAt",
                table: "FeeDues");

            migrationBuilder.DropColumn(
                name: "CancelledByUserId",
                table: "FeeDues");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "FeeDues");

            migrationBuilder.AlterColumn<Guid>(
                name: "FeeStructureId",
                table: "FeeDues",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
