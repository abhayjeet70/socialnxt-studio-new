/** GST rate is smuggled into a deal's payment_note as a `[GST:NN]` tag
 *  (see clients_.$clientId.tsx) rather than being a real column. Falls
 *  back to 18% when absent, matching the rest of the app. */
export function getDealGstRate(paymentNote?: string | null): number {
  const match = paymentNote?.match(/\[GST:(\d+)\]/);
  return match ? Number(match[1]) : 18;
}

export function getDealGrossAmount(deal: { amount?: number | null; payment_note?: string | null }): number {
  const gstRate = getDealGstRate(deal.payment_note);
  return (deal.amount || 0) * (1 + gstRate / 100);
}

export function getDealPending(deal: { amount?: number | null; advance_paid?: number | null; payment_note?: string | null }): number {
  return getDealGrossAmount(deal) - (deal.advance_paid || 0);
}
