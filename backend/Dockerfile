# TripOps API (ASP.NET Core .NET 10)
# Build từ thư mục gốc repo:  docker build -f backend/Dockerfile -t tripops-api .

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# TripOps.Api.csproj link tới ../../../../backups/.../appsettings*.json (chỉ có trên máy dev).
# Tạo file rỗng ở đúng đường dẫn đó để build/publish không lỗi; cấu hình thật truyền bằng biến môi trường.
RUN mkdir -p /backups/TripOps/backend/src/TripOps.Api \
 && echo '{}' > /backups/TripOps/backend/src/TripOps.Api/appsettings.json \
 && echo '{}' > /backups/TripOps/backend/src/TripOps.Api/appsettings.Development.json

COPY global.json ./
COPY backend/Directory.Build.props backend/
COPY backend/src backend/src
RUN dotnet restore backend/src/TripOps.Api/TripOps.Api.csproj
RUN dotnet publish backend/src/TripOps.Api/TripOps.Api.csproj -c Release -o /out --no-restore -p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
# fontconfig + font hỗ trợ tiếng Việt cho PDF hợp đồng (QuestPDF dùng "Arial" -> Liberation Sans), curl cho healthcheck.
RUN apt-get update \
 && apt-get install -y --no-install-recommends fontconfig fonts-liberation2 fonts-dejavu-core curl tzdata \
 && rm -rf /var/lib/apt/lists/*
ENV TZ=Asia/Ho_Chi_Minh \
    ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_HTTP_PORTS=8080 \
    ASPNETCORE_FORWARDEDHEADERS_ENABLED=true \
    DOTNET_RUNNING_IN_CONTAINER=true
WORKDIR /app
COPY --from=build /out ./
# Thư mục ghi dữ liệu (hợp đồng PDF, file upload local, khóa cookie) thuộc user "app" của image.
RUN mkdir -p /app/App_Data /home/app/.aspnet/DataProtection-Keys \
 && chown -R app:app /app/App_Data /home/app/.aspnet
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
  CMD curl -fsS http://localhost:8080/health || exit 1
ENTRYPOINT ["dotnet", "TripOps.Api.dll"]
