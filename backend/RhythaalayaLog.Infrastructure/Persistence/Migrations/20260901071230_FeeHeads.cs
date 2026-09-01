using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RhythaalayaLog.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FeeHeads : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "FeeHeadId",
                table: "FeeStructures",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "FeeHeadId",
                table: "FeeDues",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "FeeHeads",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeeHeads", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FeeHeads_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FeeStructures_FeeHeadId",
                table: "FeeStructures",
                column: "FeeHeadId");

            migrationBuilder.CreateIndex(
                name: "IX_FeeDues_FeeHeadId",
                table: "FeeDues",
                column: "FeeHeadId");

            migrationBuilder.CreateIndex(
                name: "IX_FeeHeads_TenantId_Name",
                table: "FeeHeads",
                columns: new[] { "TenantId", "Name" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_FeeDues_FeeHeads_FeeHeadId",
                table: "FeeDues",
                column: "FeeHeadId",
                principalTable: "FeeHeads",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_FeeStructures_FeeHeads_FeeHeadId",
                table: "FeeStructures",
                column: "FeeHeadId",
                principalTable: "FeeHeads",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FeeDues_FeeHeads_FeeHeadId",
                table: "FeeDues");

            migrationBuilder.DropForeignKey(
                name: "FK_FeeStructures_FeeHeads_FeeHeadId",
                table: "FeeStructures");

            migrationBuilder.DropTable(
                name: "FeeHeads");

            migrationBuilder.DropIndex(
                name: "IX_FeeStructures_FeeHeadId",
                table: "FeeStructures");

            migrationBuilder.DropIndex(
                name: "IX_FeeDues_FeeHeadId",
                table: "FeeDues");

            migrationBuilder.DropColumn(
                name: "FeeHeadId",
                table: "FeeStructures");

            migrationBuilder.DropColumn(
                name: "FeeHeadId",
                table: "FeeDues");
        }
    }
}
