using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RhythaalayaLog.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BatchSessionOverrides : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BatchSessionOverrides",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    BatchId = table.Column<Guid>(type: "uuid", nullable: false),
                    OriginalDate = table.Column<DateOnly>(type: "date", nullable: false),
                    NewDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Reason = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BatchSessionOverrides", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BatchSessionOverrides_Batches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "Batches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BatchSessionOverrides_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BatchSessionOverrides_BatchId",
                table: "BatchSessionOverrides",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_BatchSessionOverrides_TenantId_BatchId_OriginalDate",
                table: "BatchSessionOverrides",
                columns: new[] { "TenantId", "BatchId", "OriginalDate" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BatchSessionOverrides");
        }
    }
}
