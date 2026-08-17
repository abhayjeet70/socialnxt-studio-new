/** Drop PNG/SVG files into public/payment-logos/ — text label shows until logo exists */
export const PAYMENT_APP_LOGOS = [
  { id: "phonepe", label: "PhonePe", logo: "/payment-logos/phonepe.png", height: 24 },
  { id: "gpay", label: "GPay", logo: "/payment-logos/gpay.png", height: 24 },
  { id: "paytm", label: "Paytm", logo: "/payment-logos/paytm.png", height: 28 },
  { id: "bhim", label: "BHIM", logo: "/payment-logos/bhim.png", height: 26 },
] as const;
