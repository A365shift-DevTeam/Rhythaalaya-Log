using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Infrastructure;

/// <summary>
/// The one place the billable (net) amount of a fee due is derived from its append-only
/// adjustments. Every adjustment type reduces the bill except <see cref="FeeAdjustmentType.Fine"/>,
/// which adds to it. Correction rows carry a negative <see cref="FeeAdjustment.Amount"/> and fall
/// out of the same arithmetic.
/// </summary>
internal static class FeeDueMath
{
    /// <summary>
    /// Signed total to subtract from the gross amount: reducing adjustments count positive,
    /// fines count negative (so subtracting them adds the fine back on).
    /// </summary>
    public static decimal SignedAdjustmentTotal(IEnumerable<FeeAdjustment> adjustments) =>
        adjustments.Sum(a => a.Type == FeeAdjustmentType.Fine ? -a.Amount : a.Amount);

    /// <summary>Billable amount = gross − reducing adjustments + fines.</summary>
    public static decimal NetAmount(decimal grossAmount, IEnumerable<FeeAdjustment> adjustments) =>
        grossAmount - SignedAdjustmentTotal(adjustments);

    /// <summary>The cached <see cref="FeeDue.DiscountAmount"/> field: discounts and waivers only, by its documented contract.</summary>
    public static decimal DiscountAndWaiverTotal(IEnumerable<FeeAdjustment> adjustments) =>
        adjustments.Where(a => a.Type is FeeAdjustmentType.Discount or FeeAdjustmentType.Waiver).Sum(a => a.Amount);
}
