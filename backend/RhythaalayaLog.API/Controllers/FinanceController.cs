using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;

namespace RhythaalayaLog.API.Controllers;

[ApiController]
[Authorize(Roles = "TenantAdmin,Staff")]
[Route("api/finance")]
public sealed class FinanceController(
    IFinanceService service, IStudentLedgerService ledgerService, IFinanceReportingService reportingService) : ControllerBase
{
    [HttpGet("students/{studentId:guid}/ledger")]
    public async Task<ActionResult<StudentLedgerDto>> GetStudentLedger(Guid studentId, CancellationToken ct) =>
        Ok(await ledgerService.GetStudentLedgerAsync(studentId, ct));

    [HttpGet("batches/finance")]
    public async Task<ActionResult<IReadOnlyList<BatchFinanceRowDto>>> GetBatchFinanceList(CancellationToken ct) =>
        Ok(await reportingService.GetBatchFinanceListAsync(ct));

    [HttpGet("batches/{batchId:guid}/finance")]
    public async Task<ActionResult<BatchFinanceDto>> GetBatchFinance(Guid batchId, CancellationToken ct) =>
        Ok(await reportingService.GetBatchFinanceAsync(batchId, ct));

    [HttpGet("dashboard")]
    public async Task<ActionResult<FinanceDashboardDto>> GetFinanceDashboard(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] Guid? batchId,
        [FromQuery] Guid? courseId, [FromQuery] Guid? feeHeadId, CancellationToken ct) =>
        Ok(await reportingService.GetFinanceDashboardAsync(
            new FinanceDashboardQuery(from, to, batchId, courseId, feeHeadId), ct));

    [HttpGet("summary")]
    public async Task<ActionResult<FinanceSummaryDto>> GetSummary(
        [FromQuery] DateTimeOffset from, [FromQuery] DateTimeOffset to, CancellationToken ct) =>
        Ok(await service.GetFinanceAsync(from, to, ct));

    [HttpPost("transactions")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<ActionResult<TransactionDto>> CreateTransaction(CreateTransactionRequest request, CancellationToken ct)
    {
        var result = await service.CreateTransactionAsync(request, ct);
        return Created($"/api/finance/transactions/{result.Id}", result);
    }

    [HttpPut("transactions/{id:guid}")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<ActionResult<TransactionDto>> UpdateTransaction(Guid id, UpdateTransactionRequest request, CancellationToken ct) =>
        Ok(await service.UpdateTransactionAsync(id, request, ct));

    [HttpDelete("transactions/{id:guid}")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<IActionResult> DeleteTransaction(Guid id, CancellationToken ct)
    {
        await service.DeleteTransactionAsync(id, ct);
        return NoContent();
    }

    [HttpGet("fee-heads")]
    public async Task<ActionResult<IReadOnlyList<FeeHeadDto>>> GetFeeHeads(CancellationToken ct) =>
        Ok(await service.GetFeeHeadsAsync(ct));

    [HttpPost("fee-heads")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<ActionResult<FeeHeadDto>> CreateFeeHead(CreateFeeHeadRequest request, CancellationToken ct)
    {
        var result = await service.CreateFeeHeadAsync(request, ct);
        return Created($"/api/finance/fee-heads/{result.Id}", result);
    }

    [HttpPut("fee-heads/{id:guid}")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<ActionResult<FeeHeadDto>> UpdateFeeHead(Guid id, UpdateFeeHeadRequest request, CancellationToken ct) =>
        Ok(await service.UpdateFeeHeadAsync(id, request, ct));

    [HttpGet("reports/collections")]
    public async Task<ActionResult<CollectionReportDto>> GetCollectionReport(
        [FromQuery] DateOnly from, [FromQuery] DateOnly to,
        [FromQuery] CollectionGranularity granularity, CancellationToken ct) =>
        Ok(await reportingService.GetCollectionReportAsync(from, to, granularity, ct));

    [HttpGet("fee-structures")]
    public async Task<ActionResult<IReadOnlyList<FeeStructureDto>>> GetFeeStructures(
        [FromQuery] Guid? courseId, CancellationToken ct) =>
        Ok(await service.GetFeeStructuresAsync(courseId, ct));

    [HttpPost("fee-structures")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<ActionResult<FeeStructureDto>> CreateFeeStructure(CreateFeeStructureRequest request, CancellationToken ct)
    {
        var result = await service.CreateFeeStructureAsync(request, ct);
        return Created($"/api/finance/fee-structures/{result.Id}", result);
    }

    [HttpPut("fee-structures/{id:guid}")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<ActionResult<FeeStructureDto>> UpdateFeeStructure(Guid id, UpdateFeeStructureRequest request, CancellationToken ct) =>
        Ok(await service.UpdateFeeStructureAsync(id, request, ct));

    [HttpGet("dues")]
    public async Task<ActionResult<IReadOnlyList<FeeDueDto>>> GetDues([FromQuery] FeeDueStatus? status, CancellationToken ct) =>
        Ok(await service.GetFeeDuesAsync(status, ct));

    [HttpGet("students/{studentId:guid}/dues")]
    public async Task<ActionResult<IReadOnlyList<FeeDueDto>>> GetStudentDues(Guid studentId, CancellationToken ct) =>
        Ok(await service.GetStudentFeeDuesAsync(studentId, ct));

    [HttpPost("dues/{dueId:guid}/adjustments")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<ActionResult<FeeDueDto>> AddAdjustment(Guid dueId, AddFeeAdjustmentRequest request, CancellationToken ct) =>
        Ok(await service.AddFeeAdjustmentAsync(dueId, request, ct));

    [HttpGet("dues/{dueId:guid}/adjustments")]
    public async Task<ActionResult<IReadOnlyList<FeeAdjustmentDto>>> GetAdjustments(Guid dueId, CancellationToken ct) =>
        Ok(await service.GetFeeAdjustmentsAsync(dueId, ct));

    [HttpPost("dues/{dueId:guid}/cancel")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<ActionResult<FeeDueDto>> CancelDue(Guid dueId, CancelFeeDueRequest request, CancellationToken ct) =>
        Ok(await service.CancelFeeDueAsync(dueId, request, ct));

    [HttpPost("dues/custom")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<ActionResult<FeeDueDto>> CreateCustomDue(CreateCustomFeeDueRequest request, CancellationToken ct)
    {
        var result = await service.CreateCustomFeeDueAsync(request, ct);
        return Created($"/api/finance/dues/{result.Id}", result);
    }

    [HttpPost("dues/custom/batch")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<ActionResult<IReadOnlyList<FeeDueDto>>> CreateBatchCustomDues(
        CreateBatchCustomFeeDueRequest request, CancellationToken ct) =>
        Ok(await service.CreateCustomFeeDuesForBatchAsync(request, ct));

    [HttpGet("students/{studentId:guid}/payments")]
    public async Task<ActionResult<IReadOnlyList<FeePaymentDto>>> GetStudentPayments(Guid studentId, CancellationToken ct) =>
        Ok(await service.GetStudentPaymentsAsync(studentId, ct));

    [HttpPost("payments")]
    public async Task<ActionResult<FeePaymentDto>> RecordPayment(RecordFeePaymentRequest request, CancellationToken ct)
    {
        var result = await service.RecordFeePaymentAsync(request, ct);
        return Created($"/api/finance/payments/{result.Id}", result);
    }

    [HttpPost("payments/{paymentId:guid}/refund")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<ActionResult<FeePaymentDto>> Refund(Guid paymentId, RefundFeePaymentRequest request, CancellationToken ct) =>
        Ok(await service.RefundFeePaymentAsync(paymentId, request, ct));

    [HttpGet("payments/{paymentId:guid}/receipt")]
    public async Task<ActionResult<ReceiptDto>> GetReceipt(Guid paymentId, CancellationToken ct) =>
        Ok(await service.GetReceiptAsync(paymentId, ct));
}
