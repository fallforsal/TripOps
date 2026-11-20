using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TripOps.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRealtimeDirectChat : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_chat_messages_conversation_id",
                table: "chat_messages");

            migrationBuilder.DropIndex(
                name: "IX_chat_conversations_user_two_id",
                table: "chat_conversations");

            migrationBuilder.AddColumn<Guid>(
                name: "client_message_id",
                table: "chat_messages",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "pair_high",
                table: "chat_conversations",
                type: "nvarchar(36)",
                maxLength: 36,
                nullable: true,
                computedColumnSql: "CASE WHEN user_one_id < user_two_id THEN user_two_id ELSE user_one_id END",
                stored: true);

            migrationBuilder.AddColumn<string>(
                name: "pair_low",
                table: "chat_conversations",
                type: "nvarchar(36)",
                maxLength: 36,
                nullable: true,
                computedColumnSql: "CASE WHEN user_one_id < user_two_id THEN user_one_id ELSE user_two_id END",
                stored: true);

            migrationBuilder.CreateIndex(
                name: "IX_chat_messages_conversation_id_id",
                table: "chat_messages",
                columns: new[] { "conversation_id", "id" });

            migrationBuilder.CreateIndex(
                name: "IX_chat_messages_conversation_id_sender_id_client_message_id",
                table: "chat_messages",
                columns: new[] { "conversation_id", "sender_id", "client_message_id" },
                unique: true,
                filter: "[client_message_id] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_chat_messages_conversation_id_sender_id_is_read",
                table: "chat_messages",
                columns: new[] { "conversation_id", "sender_id", "is_read" });

            migrationBuilder.CreateIndex(
                name: "IX_chat_conversations_pair_low_pair_high",
                table: "chat_conversations",
                columns: new[] { "pair_low", "pair_high" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_chat_conversations_user_one_id_last_message_at",
                table: "chat_conversations",
                columns: new[] { "user_one_id", "last_message_at" });

            migrationBuilder.CreateIndex(
                name: "IX_chat_conversations_user_two_id_last_message_at",
                table: "chat_conversations",
                columns: new[] { "user_two_id", "last_message_at" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_chat_distinct_users",
                table: "chat_conversations",
                sql: "user_one_id <> user_two_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_chat_messages_conversation_id_id",
                table: "chat_messages");

            migrationBuilder.DropIndex(
                name: "IX_chat_messages_conversation_id_sender_id_client_message_id",
                table: "chat_messages");

            migrationBuilder.DropIndex(
                name: "IX_chat_messages_conversation_id_sender_id_is_read",
                table: "chat_messages");

            migrationBuilder.DropIndex(
                name: "IX_chat_conversations_pair_low_pair_high",
                table: "chat_conversations");

            migrationBuilder.DropIndex(
                name: "IX_chat_conversations_user_one_id_last_message_at",
                table: "chat_conversations");

            migrationBuilder.DropIndex(
                name: "IX_chat_conversations_user_two_id_last_message_at",
                table: "chat_conversations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_chat_distinct_users",
                table: "chat_conversations");

            migrationBuilder.DropColumn(
                name: "pair_high",
                table: "chat_conversations");

            migrationBuilder.DropColumn(
                name: "pair_low",
                table: "chat_conversations");

            migrationBuilder.DropColumn(
                name: "client_message_id",
                table: "chat_messages");

            migrationBuilder.CreateIndex(
                name: "IX_chat_messages_conversation_id",
                table: "chat_messages",
                column: "conversation_id");

            migrationBuilder.CreateIndex(
                name: "IX_chat_conversations_user_two_id",
                table: "chat_conversations",
                column: "user_two_id");
        }
    }
}
