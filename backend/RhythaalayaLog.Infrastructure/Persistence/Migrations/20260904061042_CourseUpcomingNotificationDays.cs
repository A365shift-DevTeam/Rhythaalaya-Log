using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RhythaalayaLog.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CourseUpcomingNotificationDays : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "FeeDueLeadDays",
                table: "Courses",
                newName: "UpcomingNotificationDays");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "UpcomingNotificationDays",
                table: "Courses",
                newName: "FeeDueLeadDays");
        }
    }
}
