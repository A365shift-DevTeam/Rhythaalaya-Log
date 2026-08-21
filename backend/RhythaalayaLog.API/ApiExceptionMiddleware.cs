using Microsoft.EntityFrameworkCore;
using RhythaalayaLog.Application;

namespace RhythaalayaLog.API;

public sealed class ApiExceptionMiddleware(RequestDelegate next, ILogger<ApiExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception exception)
        {
            var status = exception switch
            {
                NotFoundException => StatusCodes.Status404NotFound,
                InvalidCredentialsException => StatusCodes.Status401Unauthorized,
                ConflictException or DbUpdateException => StatusCodes.Status409Conflict,
                AppValidationException => StatusCodes.Status400BadRequest,
                _ => StatusCodes.Status500InternalServerError
            };
            if (status == StatusCodes.Status500InternalServerError)
                logger.LogError(exception, "Unhandled API error");
            await Results.Problem(statusCode: status,
                title: status == 500 ? "An unexpected error occurred." : exception.Message,
                extensions: new Dictionary<string, object?> { ["traceId"] = context.TraceIdentifier })
                .ExecuteAsync(context);
        }
    }
}
