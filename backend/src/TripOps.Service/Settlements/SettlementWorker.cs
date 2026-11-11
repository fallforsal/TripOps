using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace TripOps.Service.Settlements;

/// <summary>
/// Tác vụ chạy ngầm: cứ WorkerIntervalMinutes phút quét một lần, tự chuyển tiền cho các khoản quyết toán đã tới hẹn.
/// Chỉ chạy khi Settlement:AutoPayoutEnabled = true VÀ đã cấu hình PayOsPayout (tiền thật).
/// API tắt đúng ngày hẹn thì lần chạy kế tiếp sau khi bật lại sẽ chuyển bù.
/// </summary>
public sealed class SettlementWorker(IServiceScopeFactory scopes, SettlementOptions options, ILogger<SettlementWorker> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.AutoPayoutEnabled)
        {
            logger.LogInformation("Automatic agency settlement is disabled (Settlement:AutoPayoutEnabled = false).");
            return;
        }
        try
        {
            // Chờ API khởi động xong rồi mới quét lần đầu.
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            using var timer = new PeriodicTimer(TimeSpan.FromMinutes(options.WorkerIntervalMinutes));
            do
            {
                try
                {
                    using var scope = scopes.CreateScope();
                    var result = await scope.ServiceProvider.GetRequiredService<AgencySettlementService>().RunDue(stoppingToken);
                    if (result.Started > 0 || result.Synced > 0 || result.Errors.Count > 0)
                        logger.LogInformation("Agency settlement run: {Started} started, {Synced} synced, {Waiting} waiting, {Errors} errors.",
                            result.Started, result.Synced, result.Waiting, result.Errors.Count);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception exception)
                {
                    // Không để lỗi một lượt làm dừng cả API; lượt sau thử lại.
                    logger.LogError(exception, "Agency settlement run failed.");
                }
            } while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
        }
    }
}
