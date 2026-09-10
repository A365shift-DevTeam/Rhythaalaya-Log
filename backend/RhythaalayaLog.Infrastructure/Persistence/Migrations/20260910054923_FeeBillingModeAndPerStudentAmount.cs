using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RhythaalayaLog.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FeeBillingModeAndPerStudentAmount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BillingMode",
                table: "FeeStructures",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                // Every existing plan bills one price for everyone, which is the Fixed mode.
                defaultValue: "Fixed");

            migrationBuilder.AddColumn<decimal>(
                name: "FeeAmountOverride",
                table: "Enrollments",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "FeeAmountSetOn",
                table: "Enrollments",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BillingMode",
                table: "FeeStructures");

            migrationBuilder.DropColumn(
                name: "FeeAmountOverride",
                table: "Enrollments");

            migrationBuilder.DropColumn(
                name: "FeeAmountSetOn",
                table: "Enrollments");
        }
    }
}
