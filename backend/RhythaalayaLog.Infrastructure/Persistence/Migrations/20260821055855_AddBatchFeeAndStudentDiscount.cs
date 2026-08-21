using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RhythaalayaLog.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBatchFeeAndStudentDiscount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "DiscountAmount",
                table: "Students",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyFee",
                table: "Batches",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 1500m);

            migrationBuilder.Sql("""
                UPDATE "Batches" AS batch
                SET "MonthlyFee" = COALESCE(
                    (SELECT MAX(student."MonthlyFee")
                     FROM "Students" AS student
                     WHERE student."BatchId" = batch."Id" AND student."IsActive" = TRUE),
                    1500
                );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DiscountAmount",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "MonthlyFee",
                table: "Batches");
        }
    }
}
