using System.Net;
using System.Net.Http.Json;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Chat;
namespace TripOps.Tests;

public sealed class ChatFlowTests
{
    private static readonly (string Id, UserRole Role)[] ActiveAccounts =
    [
        ("customer", UserRole.Customer),
        ("agency", UserRole.TravelAgency),
        ("provider", UserRole.Provider),
        ("outsider", UserRole.Customer),
        ("admin", UserRole.Admin),
        ("guide", UserRole.TourGuide),
        ("user", UserRole.User)
    ];

    sealed class App : WebApplicationFactory<Program>
    {
        readonly SqliteConnection dbConnection = new($"Data Source=chat-{Guid.NewGuid():N};Mode=Memory;Cache=Shared");
        public App() => dbConnection.Open();
        protected override void ConfigureWebHost(IWebHostBuilder builder) {
            builder.UseEnvironment("Development");
            builder.ConfigureServices(services => {
                services.AddSingleton<IDataProtectionProvider>(new EphemeralDataProtectionProvider());
                services.RemoveAll<DbContextOptions<TripOpsDbContext>>();
                services.RemoveAll<IDbContextOptionsConfiguration<TripOpsDbContext>>();
                // Each request needs its own connection for the concurrent-creation test.
                // The anchor connection keeps this isolated in-memory database alive.
                services.AddDbContext<TripOpsDbContext>(o => o.UseSqlite(dbConnection.ConnectionString));
            });
        }
        public async Task Seed() {
            using var scope = Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            await db.Database.EnsureCreatedAsync();
            foreach (var (id, role) in ActiveAccounts)
            {
                var user = new User { Id = id, Name = id, Email = $"{id}@chat.test", Role = role };
                user.PasswordHash = new PasswordHasher<User>().HashPassword(user, "ChatPass123!");
                db.Users.Add(user);
            }
            db.Users.Add(new User { Id = "banned", Name = "banned", Email = "banned@chat.test", Status = UserStatus.Banned });
            await db.SaveChangesAsync();
        }
        public async Task<(HttpClient Client,string Cookie)> Login(string id) {
            var client=CreateClient();var response=await client.PostAsJsonAsync("/api/v1/auth/login",new {email=$"{id}@chat.test",password="ChatPass123!"});
            response.EnsureSuccessStatusCode();return (client,response.Headers.GetValues("Set-Cookie").First().Split(';')[0]);
        }
        public async Task<Wire> Connect(string cookie) {
            var client=Server.CreateWebSocketClient();client.ConfigureRequest=r => r.Headers.Cookie=cookie;
            var socket=await client.ConnectAsync(new Uri("ws://localhost/hubs/chat"),CancellationToken.None);
            var wire=new Wire(socket);await wire.Send(new {protocol="json",version=1});await wire.Next(_ => true);return wire;
        }
        protected override void Dispose(bool disposing) {base.Dispose(disposing);if(disposing) dbConnection.Dispose();}
    }
    sealed class Wire(WebSocket socket) : IDisposable
    {
        readonly Queue<JsonElement> messages=new(); string pending="";
        public async Task Send(object payload) {var bytes=Encoding.UTF8.GetBytes(JsonSerializer.Serialize(payload)+"\u001e");await socket.SendAsync(bytes,WebSocketMessageType.Text,true,CancellationToken.None);}
        public async Task<JsonElement> Next(Func<JsonElement,bool> match) {
            using var timeout=new CancellationTokenSource(TimeSpan.FromSeconds(10));
            while(true) {
                while(messages.TryDequeue(out var message)) if(match(message)) return message;
                var buffer=new byte[16384];var result=await socket.ReceiveAsync(buffer,timeout.Token);
                Assert.NotEqual(WebSocketMessageType.Close,result.MessageType);
                pending+=Encoding.UTF8.GetString(buffer,0,result.Count);
                int split;while((split=pending.IndexOf('\u001e'))>=0) {messages.Enqueue(JsonDocument.Parse(pending[..split]).RootElement.Clone());pending=pending[(split+1)..];}
            }
        }
        public Task<JsonElement> Event(string name) => Next(m => m.TryGetProperty("target",out var t) && t.GetString()==name);
        public async Task<JsonElement> Invoke(string name, params object[] arguments) {
            var id=Guid.NewGuid().ToString();await Send(new {type=1,invocationId=id,target=name,arguments});
            return await Next(m => m.TryGetProperty("invocationId",out var i) && i.GetString()==id && m.GetProperty("type").GetInt32()==3);
        }
        public void Dispose() {socket.Abort();socket.Dispose();}
    }
    static async Task<int> Create(HttpClient client,string userId) {
        var result=await client.PostAsJsonAsync("/api/v1/chat/conversations",new {userId});result.EnsureSuccessStatusCode();
        return (await result.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }
    [Fact]
    public async Task Every_active_role_can_discover_and_message_every_other_active_account()
    {
        await using var app = new App();
        await app.Seed();
        var clients = new List<HttpClient>();
        try
        {
            foreach (var (id, _) in ActiveAccounts)
            {
                var (client, _) = await app.Login(id);
                clients.Add(client);
                var contacts = await client.GetFromJsonAsync<List<ChatContact>>("/api/v1/chat/contacts");
                Assert.Equal(ActiveAccounts.Select(account => account.Id).Where(other => other != id).Order(),
                    contacts!.Select(contact => contact.Id).Order());
            }

            for (var sender = 0; sender < clients.Count; sender++)
            {
                for (var recipient = sender + 1; recipient < clients.Count; recipient++)
                {
                    var id = await Create(clients[sender], ActiveAccounts[recipient].Id);
                    Assert.Equal(id, await Create(clients[recipient], ActiveAccounts[sender].Id));
                    var path = $"/api/v1/chat/conversations/{id}/messages";
                    (await clients[sender].PostAsJsonAsync(path, new { content = "Hello", clientMessageId = Guid.NewGuid() })).EnsureSuccessStatusCode();
                    var history = await clients[recipient].GetFromJsonAsync<MessagePage>(path);
                    Assert.Equal(ActiveAccounts[sender].Id, Assert.Single(history!.Items).SenderId);
                }
            }
        }
        finally
        {
            foreach (var client in clients) client.Dispose();
        }
    }

    [Fact]
    public async Task Authorization_contacts_validation_idempotency_history_and_read_receipts() {
        await using var app=new App();await app.Seed();using var anonymous=app.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized,(await anonymous.GetAsync("/api/v1/chat/conversations")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,(await anonymous.GetAsync("/hubs/chat")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,(await anonymous.PostAsync("/hubs/chat/negotiate?negotiateVersion=1",null)).StatusCode);
        var (customer,_)=await app.Login("customer");var (agency,_a)=await app.Login("agency");var (outsider,_o)=await app.Login("outsider");
        using(customer) using(agency) using(outsider) {
            Assert.Equal(HttpStatusCode.Forbidden,(await customer.PostAsJsonAsync("/api/v1/chat/conversations",new {userId="banned"})).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden,(await customer.PostAsJsonAsync("/api/v1/chat/conversations",new {userId="customer"})).StatusCode);
            using(var badOrigin=new HttpRequestMessage(HttpMethod.Post,"/hubs/chat/negotiate?negotiateVersion=1")) {badOrigin.Headers.Add("Origin","https://untrusted.example");Assert.Equal(HttpStatusCode.Forbidden,(await customer.SendAsync(badOrigin)).StatusCode);}
            var id=await Create(customer,"agency");Assert.Equal(id,await Create(agency,"customer"));
            var path=$"/api/v1/chat/conversations/{id}";
            Assert.Equal(HttpStatusCode.NotFound,(await outsider.GetAsync(path+"/messages")).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound,(await outsider.PostAsJsonAsync(path+"/messages",new {content="x",clientMessageId=Guid.NewGuid()})).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound,(await outsider.PatchAsJsonAsync(path+"/read",new {})).StatusCode);
            foreach(var content in new[] {" ",new string('x',2001)}) Assert.Equal(HttpStatusCode.BadRequest,(await customer.PostAsJsonAsync(path+"/messages",new {content,clientMessageId=Guid.NewGuid()})).StatusCode);
            var key=Guid.NewGuid();var body=new {content="  hello <script>  ",clientMessageId=key,senderId="outsider"};
            var sent=await customer.PostAsJsonAsync(path+"/messages",body);sent.EnsureSuccessStatusCode();var message=(await sent.Content.ReadFromJsonAsync<MessageDto>())!;
            Assert.Equal("customer",message.SenderId);Assert.Equal("hello <script>",message.Content);
            var repeated=await customer.PostAsJsonAsync(path+"/messages",body);repeated.EnsureSuccessStatusCode();Assert.Equal(message.Id,(await repeated.Content.ReadFromJsonAsync<MessageDto>())!.Id);
            Assert.Equal(HttpStatusCode.Conflict,(await customer.PostAsJsonAsync(path+"/messages",new {content="changed",clientMessageId=key})).StatusCode);
            for(var n=0;n<3;n++) (await agency.PostAsJsonAsync(path+"/messages",new {content=$"reply {n}",clientMessageId=Guid.NewGuid()})).EnsureSuccessStatusCode();
            var first=(await customer.GetFromJsonAsync<MessagePage>(path+"/messages?limit=2"))!;Assert.Equal(2,first.Items.Count);Assert.NotNull(first.NextCursor);
            var older=(await customer.GetFromJsonAsync<MessagePage>(path+$"/messages?limit=2&cursor={first.NextCursor}"))!;Assert.Equal(2,older.Items.Count);Assert.Null(older.NextCursor);Assert.Empty(first.Items.IntersectBy(older.Items.Select(m=>m.Id),m=>m.Id));
            Assert.Equal(3,Assert.Single((await customer.GetFromJsonAsync<List<ConversationDto>>("/api/v1/chat/conversations"))!).UnreadCount);
            (await customer.PatchAsJsonAsync(path+"/read",new {throughMessageId=first.Items[0].Id})).EnsureSuccessStatusCode();
            Assert.Equal(1,Assert.Single((await customer.GetFromJsonAsync<List<ConversationDto>>("/api/v1/chat/conversations"))!).UnreadCount);
            Assert.NotNull((await customer.GetFromJsonAsync<MessagePage>(path+"/messages"))!.Items.First(m=>m.SenderId=="agency").ReadAt);
            using var scope=app.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var account=await db.Users.SingleAsync(u=>u.Id=="agency");account.Status=UserStatus.Banned;await db.SaveChangesAsync();
            Assert.Equal(HttpStatusCode.Forbidden,(await customer.GetAsync(path+"/messages")).StatusCode);
            Assert.Empty((await customer.GetFromJsonAsync<List<ConversationDto>>("/api/v1/chat/conversations"))!);
        }
    }
    [Fact]
    public async Task Hub_broadcasts_to_all_tabs_authorizes_each_method_and_reconnect_recovers_history() {
        await using var app=new App();await app.Seed();
        var (customer,cc)=await app.Login("customer");var (agency,ac)=await app.Login("agency");var (outsider,oc)=await app.Login("outsider");
        using(customer) using(agency) using(outsider) using(var a1=await app.Connect(cc)) using(var a2=await app.Connect(cc)) using(var b1=await app.Connect(ac)) using(var other=await app.Connect(oc)) {
            var id=await Create(customer,"agency");
            Assert.False((await a1.Invoke("JoinConversation",id)).TryGetProperty("error",out _));
            foreach(var method in new[] {"JoinConversation","LeaveConversation","MarkAsRead"}) Assert.True((await other.Invoke(method, method=="MarkAsRead" ? [id,null!] : [id])).TryGetProperty("error",out _));
            Assert.True((await other.Invoke("SendMessage",id,"blocked",Guid.NewGuid())).TryGetProperty("error",out _));
            var send=await b1.Invoke("SendMessage",id,"realtime",Guid.NewGuid());Assert.False(send.TryGetProperty("error",out _));
            foreach(var wire in new[] {a1,a2}) Assert.Equal("realtime",(await wire.Event("ReceiveMessage")).GetProperty("arguments")[0].GetProperty("content").GetString());
            Assert.False((await a1.Invoke("MarkAsRead",id,null!)).TryGetProperty("error",out _));
            Assert.Equal("customer",(await a2.Event("MessagesRead")).GetProperty("arguments")[0].GetProperty("userId").GetString());
            await b1.Event("MessagesRead");
            b1.Dispose();
            (await customer.PostAsJsonAsync($"/api/v1/chat/conversations/{id}/messages",new {content="missed while offline",clientMessageId=Guid.NewGuid()})).EnsureSuccessStatusCode();
            await a1.Event("ReceiveMessage"); await a2.Event("ReceiveMessage");
            using(var reconnect=await app.Connect(ac)) {
                var history=(await agency.GetFromJsonAsync<MessagePage>($"/api/v1/chat/conversations/{id}/messages"))!;
                Assert.Equal(2,history.Items.Count);Assert.NotNull(history.Items[0].ReadAt);Assert.Equal("missed while offline",history.Items[1].Content);
                Assert.False((await reconnect.Invoke("JoinConversation",id)).TryGetProperty("error",out _));
                var sent=await customer.PostAsJsonAsync($"/api/v1/chat/conversations/{id}/messages",new {content="after reconnect",clientMessageId=Guid.NewGuid()});sent.EnsureSuccessStatusCode();
                Assert.Equal("after reconnect",(await a2.Event("ReceiveMessage")).GetProperty("arguments")[0].GetProperty("content").GetString());
                Assert.Equal("after reconnect",(await reconnect.Event("ReceiveMessage")).GetProperty("arguments")[0].GetProperty("content").GetString());
            }
        }
    }
    [Fact]
    public async Task Concurrent_creation_returns_one_conversation_and_rejects_reversed_duplicate() {
        await using var app=new App();await app.Seed();var (agency,_)=await app.Login("agency");var (provider,_p)=await app.Login("provider");
        using(agency) using(provider) {
            var results=await Task.WhenAll(Enumerable.Range(0,8).Select(i=>Create(i%2==0 ? agency:provider,i%2==0 ? "provider":"agency")));
            Assert.Single(results.Distinct());
            using var scope=app.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var c=await db.ChatConversations.SingleAsync();
            db.ChatConversations.Add(new ChatConversation {UserOneId=c.UserTwoId,UserTwoId=c.UserOneId});
            await Assert.ThrowsAsync<DbUpdateException>(()=>db.SaveChangesAsync());
        }
    }
}
