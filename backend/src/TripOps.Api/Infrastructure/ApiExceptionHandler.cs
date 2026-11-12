using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace TripOps.Api.Infrastructure;

public sealed class ApiExceptionHandler(
    IProblemDetailsService problems, ILogger<ApiExceptionHandler> logger, IHostEnvironment environment) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is TripOps.Service.Services.ServiceModerationException expectedService)
        {
            context.Response.StatusCode = expectedService.Status;
            await problems.WriteAsync(new ProblemDetailsContext
            {
                HttpContext = context,
                ProblemDetails = new ProblemDetails { Status = expectedService.Status, Title = expectedService.Message }
            });
            return true;
        }
        if (exception is TripOps.Service.Tours.TourException expectedTour)
        {
            context.Response.StatusCode = expectedTour.Status;
            await problems.WriteAsync(new ProblemDetailsContext
            {
                HttpContext = context,
                ProblemDetails = new ProblemDetails { Status = expectedTour.Status, Title = expectedTour.Message }
            });
            return true;
        }
        if (exception is TripOps.Service.Bookings.BookingException expectedBooking)
        {
            context.Response.StatusCode = expectedBooking.Status;
            await problems.WriteAsync(new ProblemDetailsContext
            {
                HttpContext = context,
                ProblemDetails = new ProblemDetails { Status = expectedBooking.Status, Title = expectedBooking.Message }
            });
            return true;
        }
        if (exception is Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException)
        {
            context.Response.StatusCode = 409;
            await problems.WriteAsync(new ProblemDetailsContext { HttpContext = context,
                ProblemDetails = new ProblemDetails { Status = 409, Title = "Dữ liệu đã thay đổi; vui lòng tải lại." } });
            return true;
        }
        // Development: ghi đủ nội dung + vị trí lỗi để tìm nguyên nhân. Môi trường khác chỉ ghi loại lỗi như cũ.
        if (environment.IsDevelopment())
            logger.LogError(exception, "Unhandled {ExceptionType} at {Method} {Path}; trace {TraceId}",
                exception.GetType().Name, context.Request.Method, context.Request.Path, context.TraceIdentifier);
        else
            logger.LogError("Unhandled {ExceptionType}; trace {TraceId}",
                exception.GetType().Name, context.TraceIdentifier);
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await problems.WriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = new ProblemDetails
            {
                Status = StatusCodes.Status500InternalServerError,
                Title = "An unexpected error occurred.",
                Extensions = { ["traceId"] = context.TraceIdentifier }
            }
        });
        return true;
    }
}
