using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RhythaalayaLog.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BillingPeriodsGraceAndCreditNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CreditNotePrefix",
                table: "OrganizationSettings",
                type: "text",
                nullable: false,
                defaultValue: "CN");

            migrationBuilder.AddColumn<int>(
                name: "FeeOverdueGraceDays",
                table: "OrganizationSettings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "NextCreditNoteNumber",
                table: "OrganizationSettings",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<DateOnly>(
                name: "PeriodEnd",
                table: "FeeDues",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "PeriodStart",
                table: "FeeDues",
                type: "date",
                nullable: true);

            // Refunds were booked as expenses; they are contra-revenue. Re-class the historical
            // refund rows (the ones linked to a refund payment) as negative income so revenue,
            // refunds and expenses reconcile. Amounts are preserved, only sign and type change.
            migrationBuilder.Sql("""
                UPDATE "Transactions" t
                SET "Type" = 'Income', "Amount" = -t."Amount"
                FROM "FeePayments" p
                WHERE t."FeePaymentId" = p."Id" AND p."RefundOfPaymentId" IS NOT NULL AND t."Type" = 'Expense';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE "Transactions" t
                SET "Type" = 'Expense', "Amount" = -t."Amount"
                FROM "FeePayments" p
                WHERE t."FeePaymentId" = p."Id" AND p."RefundOfPaymentId" IS NOT NULL AND t."Type" = 'Income';
                """);

            migrationBuilder.DropColumn(
                name: "CreditNotePrefix",
                table: "OrganizationSettings");

            migrationBuilder.DropColumn(
                name: "FeeOverdueGraceDays",
                table: "OrganizationSettings");

            migrationBuilder.DropColumn(
                name: "NextCreditNoteNumber",
                table: "OrganizationSettings");

            migrationBuilder.DropColumn(
                name: "PeriodEnd",
                table: "FeeDues");

            migrationBuilder.DropColumn(
                name: "PeriodStart",
                table: "FeeDues");
        }
    }
}
