using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RhythaalayaLog.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddReceiptCategoriesNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AttendanceNotifications",
                table: "OrganizationSettings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "ExpenseCategoriesJson",
                table: "OrganizationSettings",
                type: "text",
                nullable: false,
                defaultValue: "[\"Rent & Operations\",\"Instructor Salary\",\"Equipment\",\"Utilities\",\"Marketing\",\"Other Expense\"]");

            migrationBuilder.AddColumn<bool>(
                name: "FeeReminderNotifications",
                table: "OrganizationSettings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "IncomeCategoriesJson",
                table: "OrganizationSettings",
                type: "text",
                nullable: false,
                defaultValue: "[\"Student Fees\",\"Registration\",\"Events\",\"Other Income\"]");

            migrationBuilder.AddColumn<bool>(
                name: "NotificationsEnabled",
                table: "OrganizationSettings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "PaymentNotifications",
                table: "OrganizationSettings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptAddress",
                table: "OrganizationSettings",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ReceiptAutoOpen",
                table: "OrganizationSettings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptEmail",
                table: "OrganizationSettings",
                type: "character varying(254)",
                maxLength: 254,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptFooter",
                table: "OrganizationSettings",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "Thank you for your payment.");

            migrationBuilder.AddColumn<string>(
                name: "ReceiptPhone",
                table: "OrganizationSettings",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptPrefix",
                table: "OrganizationSettings",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "REC");

            migrationBuilder.AddColumn<bool>(
                name: "ReceiptShowLogo",
                table: "OrganizationSettings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "ReceiptShowSignature",
                table: "OrganizationSettings",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AttendanceNotifications",
                table: "OrganizationSettings");

            migrationBuilder.DropColumn(
                name: "ExpenseCategoriesJson",
                table: "OrganizationSettings");

            migrationBuilder.DropColumn(
                name: "FeeReminderNotifications",
                table: "OrganizationSettings");

            migrationBuilder.DropColumn(
                name: "IncomeCategoriesJson",
                table: "OrganizationSettings");

            migrationBuilder.DropColumn(
                name: "NotificationsEnabled",
                table: "OrganizationSettings");

            migrationBuilder.DropColumn(
                name: "PaymentNotifications",
                table: "OrganizationSettings");

            migrationBuilder.DropColumn(
                name: "ReceiptAddress",
                table: "OrganizationSettings");

            migrationBuilder.DropColumn(
                name: "ReceiptAutoOpen",
                table: "OrganizationSettings");

            migrationBuilder.DropColumn(
                name: "ReceiptEmail",
                table: "OrganizationSettings");

            migrationBuilder.DropColumn(
                name: "ReceiptFooter",
                table: "OrganizationSettings");

            migrationBuilder.DropColumn(
                name: "ReceiptPhone",
                table: "OrganizationSettings");

            migrationBuilder.DropColumn(
                name: "ReceiptPrefix",
                table: "OrganizationSettings");

            migrationBuilder.DropColumn(
                name: "ReceiptShowLogo",
                table: "OrganizationSettings");

            migrationBuilder.DropColumn(
                name: "ReceiptShowSignature",
                table: "OrganizationSettings");
        }
    }
}
