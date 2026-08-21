using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RhythaalayaLog.Application;

namespace RhythaalayaLog.API.Controllers;

[ApiController]
[Authorize(Roles = "TenantAdmin,Staff")]
[Route("api/finance")]
public sealed class FinanceController(IAcademyService service) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<ActionResult<FinanceSummaryDto>> GetSummary(
        [FromQuery] DateTimeOffset from, [FromQuery] DateTimeOffset to, CancellationToken ct) =>
        Ok(await service.GetFinanceAsync(from, to, ct));

    [HttpPost("transactions")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<ActionResult<TransactionDto>> CreateTransaction(
        CreateTransactionRequest request, CancellationToken ct)
    {
        var result = await service.CreateTransactionAsync(request, ct);
        return Created($"/api/finance/transactions/{result.Id}", result);
    }

    [HttpPost("payments")]
    public async Task<ActionResult<PaymentDto>> RecordPayment(
        RecordPaymentRequest request, CancellationToken ct)
    {
        var result = await service.RecordPaymentAsync(request, ct);
        return Created($"/api/finance/payments/{result.Id}", result);
    }
}
