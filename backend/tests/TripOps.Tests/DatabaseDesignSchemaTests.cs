using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using TripOps.Data;
using TripOps.Data.Entities;

namespace TripOps.Tests;

public sealed class DatabaseDesignSchemaTests
{
    [Fact]
    public void Every_table_and_column_in_database_md_is_mapped()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "backend", "database.md")))
            directory = directory.Parent;
        Assert.NotNull(directory);
        var source = File.ReadAllText(Path.Combine(directory.FullName, "backend", "database.md"));
        using var db = new TripOpsDbContext(new DbContextOptionsBuilder<TripOpsDbContext>()
            .UseSqlServer("Server=.;Database=SchemaContract;Integrated Security=True").Options);
        var relational = db.GetService<IDesignTimeModel>().Model.GetRelationalModel();
        var tables = relational.Tables.ToDictionary(t => t.Name);
        string? tableName = null;
        var depth = 0;
        var tableCount = 0;
        var columnCount = 0;
        foreach (var raw in source.Split('\n'))
        {
            var line = raw.Trim();
            if (line.StartsWith("//")) continue;
            var table = Regex.Match(line, @"^Table\s+(\w+)\s*\{");
            if (table.Success)
            {
                tableName = table.Groups[1].Value;
                Assert.True(tables.ContainsKey(tableName), $"Unmapped table: {tableName}");
                tableCount++; depth = 1; continue;
            }
            if (tableName is null) continue;
            if (line.StartsWith("indexes")) { depth++; continue; }
            if (line.StartsWith('}')) { if (--depth == 0) tableName = null; continue; }
            if (depth != 1) continue;
            var column = Regex.Match(line, @"^(\w+)\s+(varchar|text|json|int|decimal|boolean|timestamp|date|user_role_enum)\b");
            if (!column.Success) continue;
            var name = column.Groups[1].Value;
            Assert.True(tables[tableName].Columns.Any(c => c.Name == name), $"Unmapped column: {tableName}.{name}");
            var actual = tables[tableName].Columns.Single(c => c.Name == name);
            var required = Regex.IsMatch(line, @"\[[^\]]*\b(not null|pk)\b");
            Assert.True(actual.IsNullable == !required, $"NULL contract differs: {tableName}.{name}");
            columnCount++;
        }
        Assert.Equal(39, tableCount);
        Assert.Equal(494, columnCount);
        Assert.Equal(tableCount, tables.Count);
        Assert.Equal(columnCount, tables.Values.Sum(t => t.Columns.Count()));
    }

    [Fact]
    public void Merged_migration_snapshot_matches_current_model()
    {
        using var db = new TripOpsDbContext(new DbContextOptionsBuilder<TripOpsDbContext>()
            .UseSqlServer("Server=.;Database=SchemaContract;Integrated Security=True").Options);
        Assert.False(db.Database.HasPendingModelChanges(), "Merged migration snapshot is missing model changes.");
    }

    [Fact]
    public void Participant_guide_references_users_and_snapshot_uniqueness_is_enforced()
    {
        using var db = new TripOpsDbContext(new DbContextOptionsBuilder<TripOpsDbContext>()
            .UseSqlServer("Server=.;Database=SchemaContract;Integrated Security=True").Options);
        var model = db.GetService<IDesignTimeModel>().Model;
        var participant = model.FindEntityType(typeof(BookingParticipant))!;
        Assert.Contains(participant.GetForeignKeys(), f =>
            f.Properties.Count == 1 && f.Properties.Single().Name == nameof(BookingParticipant.AssignedGuideId) && f.PrincipalEntityType.ClrType == typeof(User));
        Assert.Contains(participant.GetIndexes(), i => i.IsUnique &&
            i.Properties.Select(p => p.Name).SequenceEqual(new[] { "BookingId", "AgencyId", "ParticipantIndex" }));
        var assignment = model.FindEntityType(typeof(BookingAssignedGuide))!;
        Assert.Contains(assignment.GetIndexes(), i => i.IsUnique &&
            i.Properties.Select(p => p.Name).SequenceEqual(new[] { "BookingId", "GuideId" }));
    }
}
