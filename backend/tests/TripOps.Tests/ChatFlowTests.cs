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
                if (role is UserRole.TravelAgency or UserRole.Provider) user.BusinessProfile = new BusinessProfile { UserId = id, BusinessName = id == "agency" ? "TripOps Travel" : "TripOps Hospitality", Status = BusinessProfileStatus.Approved };
                if (role == UserRole.TourGuide) user.AgencyId = "agency";
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
    public async Task Contextual_contacts_follow_business_roles_and_replying_reuses_the_same_conversation()
    {
        await using var app = new App(); await app.Seed();
        var (customer, _) = await app.Login("customer"); var (agency, _) = await app.Login("agency");
        var (provider, _) = await app.Login("provider"); var (admin, _) = await app.Login("admin");
        using (customer) using (agency) using (provider) using (admin) {
            Assert.Equal(HttpStatusCode.NotFound, (await customer.GetAsync("/api/v1/chat/contacts")).StatusCode);
            foreach (var target in new[] {"outsider", "user", "provider", "guide"})
                Assert.Equal(HttpStatusCode.Forbidden, (await customer.PostAsJsonAsync("/api/v1/chat/conversations", new {userId=target})).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await agency.PostAsJsonAsync("/api/v1/chat/conversations", new {userId="outsider"})).StatusCode);
            var id = await Create(customer, "agency"); Assert.Equal(id, await Create(agency, "customer"));
            Assert.Empty((await customer.GetFromJsonAsync<List<ConversationDto>>("/api/v1/chat/conversations"))!);
            Assert.Empty((await agency.GetFromJsonAsync<List<ConversationDto>>("/api/v1/chat/conversations"))!);
            (await customer.PostAsJsonAsync($"/api/v1/chat/conversations/{id}/messages", new {content="Xin chào",clientMessageId=Guid.NewGuid()})).EnsureSuccessStatusCode();
            var conversation = Assert.Single((await customer.GetFromJsonAsync<List<ConversationDto>>("/api/v1/chat/conversations"))!);
            Assert.Equal("TripOps Travel", conversation.Contact.BusinessName);
            Assert.Equal("TravelAgency", conversation.Contact.Role);
            var b2b = await Create(agency, "provider"); Assert.Equal(b2b, await Create(provider, "agency"));

        }
    }

    [Fact]
    public async Task Context_cards_use_server_data_and_prevent_private_tour_or_booking_disclosure()
    {
        await using var app = new App(); await app.Seed();
        int tourId, privateId, requestId, bookingId, otherBookingId, serviceId;
        using (var scope = app.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var request = new TourDesignRequest { CustomerId="customer", AgencyId="agency", Destination="Đà Lạt" };
            db.TourDesignRequests.Add(request); await db.SaveChangesAsync(); requestId=request.Id;
            var tour = new Tour { AgencyId="agency", Code="CHAT-PUBLIC", Name="Tour công khai", Status=TourStatus.Completed,
                Visibility=TourVisibility.Public, ThumbnailUrls="[\"https://example.test/cover.jpg\"]" };
            var design = new Tour { AgencyId="agency", Code="CHAT-PRIVATE", Name="Bản v2 chưa chia sẻ", IsRequest=true,
                DesignRequestId=requestId, Version=2 };
            var service = new TripOps.Data.Entities.Service { ProviderId="provider", Name="Khách sạn", Province="Lâm Đồng", ThumbnailUrl="https://example.test/service.jpg" };
            db.AddRange(tour,design,service); await db.SaveChangesAsync(); tourId=tour.Id; privateId=design.Id; serviceId=service.Id;
            db.TourVersions.AddRange(new TourVersion { TourId=privateId, VersionNumber=1, SnapshotData="{\"configuration\":{\"name\":\"Bản v1 đang chia sẻ\",\"images\":[\"https://example.test/v1.jpg\"]}}" },
                new TourVersion { TourId=privateId, VersionNumber=2, SnapshotData="{\"configuration\":{\"name\":\"Bí mật v2\",\"images\":[]}}" });
            await db.SaveChangesAsync(); design.SharedVersion=1;
            var booking = new Booking { CustomerId="customer", TourId=tourId, BookingCode="BK-CHAT" };
            var other = new Booking { CustomerId="outsider", TourId=tourId, BookingCode="BK-OTHER" };
            db.AddRange(booking,other); await db.SaveChangesAsync(); bookingId=booking.Id; otherBookingId=other.Id;
            db.BookingSupplierRequests.Add(new BookingSupplierRequest { BookingId=bookingId, ServiceId=serviceId, ProviderId="provider", ServiceName="Khách sạn", SlotKey="hotel:1" });
            await db.SaveChangesAsync();
        }
        var (customer,_)=await app.Login("customer"); var (agency,_a)=await app.Login("agency"); var (provider,_p)=await app.Login("provider");
        using(customer) using(agency) using(provider) {
            var id=await Create(customer,"agency"); var path=$"/api/v1/chat/conversations/{id}/messages";
            var key=Guid.NewGuid(); var payload=new {content="",clientMessageId=key,context=new {kind="tour",id=tourId,title="Forged title",price=999999}};
            var response=await customer.PostAsJsonAsync(path,payload); response.EnsureSuccessStatusCode();
            var dto=(await response.Content.ReadFromJsonAsync<MessageDto>())!;
            Assert.Equal("Tour công khai", dto.Context!.Title); Assert.Equal("https://example.test/cover.jpg",dto.Context.ThumbnailUrl);
            Assert.DoesNotContain("price", (await response.Content.ReadAsStringAsync()).ToLowerInvariant());
            var repeat=await customer.PostAsJsonAsync(path,payload);repeat.EnsureSuccessStatusCode();Assert.Equal(dto.Id,(await repeat.Content.ReadFromJsonAsync<MessageDto>())!.Id);
            Assert.Equal(HttpStatusCode.Conflict,(await customer.PostAsJsonAsync(path,new {content="",clientMessageId=key,context=new {kind="booking",id=bookingId}})).StatusCode);
            foreach(var card in new[] {new ChatContextInput("booking",bookingId),new ChatContextInput("design-request",requestId),new ChatContextInput("tour",privateId,1)}) {
                var sent=await agency.PostAsJsonAsync(path,new {content="",clientMessageId=Guid.NewGuid(),context=card});sent.EnsureSuccessStatusCode();
                var saved=(await sent.Content.ReadFromJsonAsync<MessageDto>())!;Assert.Equal(card.Kind,saved.Context!.Kind);
                if(card.Kind=="tour") Assert.Equal("Bản v1 đang chia sẻ",saved.Context.Title);
            }
            foreach(var card in new[] {new ChatContextInput("booking",otherBookingId),new ChatContextInput("tour",privateId,2),new ChatContextInput("service",serviceId)})
                Assert.Equal(HttpStatusCode.Forbidden,(await agency.PostAsJsonAsync(path,new {content="x",clientMessageId=Guid.NewGuid(),context=card})).StatusCode);
            Assert.Equal(HttpStatusCode.BadRequest,(await customer.PostAsJsonAsync(path,new {content="",clientMessageId=Guid.NewGuid(),context=new {kind="unknown",id=tourId}})).StatusCode);
            var b2b=await Create(provider,"agency");
            var b2bSend=await agency.PostAsJsonAsync($"/api/v1/chat/conversations/{b2b}/messages",new {content="Trao đổi dịch vụ",clientMessageId=Guid.NewGuid(),context=new {kind="service",id=serviceId}});
            b2bSend.EnsureSuccessStatusCode(); Assert.Equal("Khách sạn",(await b2bSend.Content.ReadFromJsonAsync<MessageDto>())!.Context!.Title);
            var history=(await customer.GetFromJsonAsync<MessagePage>(path))!;Assert.Equal(4,history.Items.Count);Assert.All(history.Items,m=>Assert.NotNull(m.Context));
            var previewUrl=path+$"/{dto.Id}/tour";
            var publicPreview=await customer.GetAsync(previewUrl);publicPreview.EnsureSuccessStatusCode();
            Assert.Equal("Tour công khai",(await publicPreview.Content.ReadFromJsonAsync<TripOps.Service.Tours.TourDto>())!.Configuration.Name);
            var (outsider,_o)=await app.Login("outsider");using(outsider) Assert.Equal(HttpStatusCode.NotFound,(await outsider.GetAsync(previewUrl)).StatusCode);
            var privateMessage=history.Items.Single(m=>m.Context!.Id==privateId && m.Context.Kind=="tour");
            var privateUrl=path+$"/{privateMessage.Id}/tour";
            var privatePreview=await customer.GetAsync(privateUrl);privatePreview.EnsureSuccessStatusCode();
            Assert.Equal("Bản v1 đang chia sẻ",(await privatePreview.Content.ReadFromJsonAsync<TripOps.Service.Tours.TourDto>())!.Configuration.Name);
            using(var scope=app.Services.CreateScope()) {
                var db=scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
                (await db.Tours.SingleAsync(t=>t.Id==privateId)).SharedVersion=2;
                (await db.Tours.SingleAsync(t=>t.Id==tourId)).Visibility=TourVisibility.Hidden;
                await db.SaveChangesAsync();
            }
            Assert.Equal(HttpStatusCode.Forbidden,(await customer.GetAsync(privateUrl)).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound,(await customer.GetAsync(previewUrl)).StatusCode);
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
            var results=await Task.WhenAll(Enumerable.Range(0,8).Select(i=>Create(agency,"provider")));
            Assert.Single(results.Distinct());
            Assert.Equal(results[0], await Create(provider, "agency"));
            using var scope=app.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var c=await db.ChatConversations.SingleAsync();
            db.ChatConversations.Add(new ChatConversation {UserOneId=c.UserTwoId,UserTwoId=c.UserOneId});
            await Assert.ThrowsAsync<DbUpdateException>(()=>db.SaveChangesAsync());
        }
    }
}
