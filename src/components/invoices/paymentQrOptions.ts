/** Add PNG files to public/ and register new entries here */
export const PAYMENT_QR_OPTIONS = [
  {
    id: "primary",
    label: "Primary — 9589996982",
    qrImage: "/payment-qr.png",
    upiId: "9589996982-3@ybl",
    accountNo: "9589996982",
  },
  {
    id: "alternate",
    label: "Alternate account",
    qrImage: "/payment-qr-2.png",
    upiId: "9589996982-3@ybl",
    accountNo: "9589996982",
  },
] as const;

export const CUSTOM_QR_ID = "custom";

export type PaymentQrId = (typeof PAYMENT_QR_OPTIONS)[number]["id"] | typeof CUSTOM_QR_ID;

export const getPaymentQrOption = (id?: string) =>
  PAYMENT_QR_OPTIONS.find(o => o.id === id) ?? PAYMENT_QR_OPTIONS[0];

export const getPaymentQrImage = (invoice: {
  paymentQrId?: string;
  paymentQrCustomImage?: string;
}) => {
  if (invoice.paymentQrCustomImage) return invoice.paymentQrCustomImage;
  return getPaymentQrOption(invoice.paymentQrId).qrImage;
};
