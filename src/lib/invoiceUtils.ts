
export type InvoiceStatus = "Paid" | "Sent" | "Overdue";

export type CurrencyCode = "INR" | "AED" | "GBP";

export interface CurrencyOption {
  code: CurrencyCode;
  label: string;
  symbol: string;
  locale: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "INR", label: "INR (₹)", symbol: "₹", locale: "en-IN" },
  { code: "AED", label: "AED (د.إ)", symbol: "AED ", locale: "en-AE" },
  { code: "GBP", label: "GBP (£)", symbol: "£", locale: "en-GB" },
];

export const getCurrencyOption = (code: CurrencyCode = "INR"): CurrencyOption =>
  CURRENCY_OPTIONS.find(c => c.code === code) || CURRENCY_OPTIONS[0];

export const formatCurrency = (n: number, currency: CurrencyCode = "INR"): string => {
  const opt = getCurrencyOption(currency);
  const formatted = n.toLocaleString(opt.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${opt.symbol}${formatted}`;
};

export const formatCurrencyPlain = (n: number, currency: CurrencyCode = "INR"): string => {
  const opt = getCurrencyOption(currency);
  return n.toLocaleString(opt.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export interface InvoiceLineItem {
  id: string;
  description: string;
  hsnSac: string;
  qty: number;
  unitPrice: number;
  taxLabel: string;
  taxRate: number;
}

export interface HsnSummaryRow {
  hsnSac: string;
  quantity: number;
  ratePercent: number;
  taxableValue: number;
  igst: number;
}

export interface ClientInvoice {
  id: string;
  invoiceNo: string;
  taxInvoiceTitle: string;
  projectName: string;
  invoiceDate: string;
  dueDate: string;
  source: string;
  reference: string;
  amount: number;
  status: InvoiceStatus;
  currency: CurrencyCode;
  companyName: string;
  companyLogo?: string;
  companyTagline: string;
  companyAddressLine1: string;
  companyAddressLine2: string;
  companyAddressLine3: string;
  companyGstin: string;
  clientName: string;
  clientAddress: string;
  clientGstin: string;
  placeOfSupply: string;
  lineItems: InvoiceLineItem[];
  totalInWords: string;
  paymentCommunication: string;
  paymentAccount: string;
  paymentQrId: string;
  paymentQrCustomImage?: string;
  upiId: string;
  showPaymentQr: boolean;
  showBankDetails: boolean;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  showHsnSummary: boolean;
  footerEmail: string;
  footerWebsite: string;
}

export const INVOICE_STATUSES: InvoiceStatus[] = ["Paid", "Sent", "Overdue"];
export const TAX_RATE_OPTIONS = [0, 5, 12, 18, 28] as const;

export const taxLabelFor = (rate: number) =>
  rate === 0 ? "Exempt" : `IGST ${rate}%`;

export const applyTaxRateToItems = (items: InvoiceLineItem[], rate: number): InvoiceLineItem[] =>
  items.map(li => ({ ...li, taxRate: rate, taxLabel: taxLabelFor(rate) }));

/** DD/MM/YYYY — matches sir's PDF */
export const formatInvoiceDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

export const calcLineTotal = (item: InvoiceLineItem) => item.qty * item.unitPrice;

export const calcUntaxed = (items: InvoiceLineItem[]) =>
  items.reduce((sum, i) => sum + calcLineTotal(i), 0);

export const calcLineTax = (item: InvoiceLineItem) =>
  calcLineTotal(item) * (item.taxRate / 100);

export const calcIgst = (items: InvoiceLineItem[]) =>
  items.reduce((sum, i) => sum + calcLineTax(i), 0);

export const calcTotal = (items: InvoiceLineItem[]) =>
  calcUntaxed(items) + calcIgst(items);

export const formatINR = (n: number) =>
  `₹ ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatINRPlain = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const buildHsnSummary = (items: InvoiceLineItem[]): HsnSummaryRow[] => {
  const map = new Map<string, HsnSummaryRow>();
  items.forEach(item => {
    const key = `${item.hsnSac}-${item.taxRate}`;
    const taxable = calcLineTotal(item);
    const igst = calcLineTax(item);
    const existing = map.get(key);
    if (existing) {
      existing.quantity += item.qty;
      existing.taxableValue += taxable;
      existing.igst += igst;
    } else {
      map.set(key, {
        hsnSac: item.hsnSac,
        quantity: item.qty,
        ratePercent: item.taxRate,
        taxableValue: taxable,
        igst,
      });
    }
  });
  return Array.from(map.values());
};

export const getTaxSummary = (items: InvoiceLineItem[]) => {
  const untaxed = calcUntaxed(items);
  const igst = calcIgst(items);
  const total = calcTotal(items);
  const rates = [...new Set(items.map(i => i.taxRate))].sort((a, b) => a - b);
  return { untaxed, igst, total, rates };
};

const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const twoDigits = (n: number): string => {
  if (n < 20) return ones[n];
  return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`.trim();
};

const threeDigits = (n: number): string => {
  if (n === 0) return "";
  if (n < 100) return twoDigits(n);
  return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` And ${twoDigits(n % 100)}` : ""}`;
};

export const amountToWords = (amount: number): string => {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Zero Rupees";

  const parts: string[] = [];
  let n = rupees;

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;

  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (n) parts.push(threeDigits(n));

  let result = `${parts.join(" ")} Rupee${rupees === 1 ? "" : "s"}`;
  if (paise) result += ` And ${twoDigits(paise)} Paise`;
  return result;
};

export const syncInvoiceAmount = (invoice: ClientInvoice): ClientInvoice => {
  const total = calcTotal(invoice.lineItems);
  return {
    ...invoice,
    amount: total,
    totalInWords: amountToWords(total),
  };
};

export const webnxtBase = {
  companyName: "WebNxt Digital Pvt. Ltd.",
  companyLogo: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iNjAiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IndoaXRlIi8+PHRleHQgeD0iMTAiIHk9IjQwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjgiIGZvbnQtd2VpZ2h0PSI5MDAiIGZpbGw9ImJsYWNrIj5XZWJOeHQ8L3RleHQ+PC9zdmc+",
  companyTagline: "Transform your Brand with Digital Excellence",
  companyAddressLine1: "3467-E Sudama Nagar Indore",
  companyAddressLine2: "Indore 452009",
  companyAddressLine3: "Madhya Pradesh MP., India",
  companyGstin: "23AAECW2930L1ZA",
  paymentAccount: "9589996982",
  paymentQrId: "primary",
  upiId: "iamishanshu-3@okaxis",
  showPaymentQr: true,
  showBankDetails: false,
  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankIfsc: "",
  showHsnSummary: true,
  footerEmail: "support@webnxt.co",
  footerWebsite: "http://www.webnxt.co",
};


export const blankInvoice = (): ClientInvoice => {
  const no = 'INV-NEW';
  return syncInvoiceAmount({
    id: 'NEW',
    invoiceNo: no,
    taxInvoiceTitle: `Tax Invoice ${no}`,
    projectName: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    source: 'S00000',
    reference: 'S00000',
    amount: 0,
    status: 'Sent',
    currency: 'INR',
    clientName: '',
    clientAddress: '',
    clientGstin: '',
    placeOfSupply: '',
    lineItems: [{
      id: '1', description: '', hsnSac: '998361', qty: 1,
      unitPrice: 0, taxLabel: 'IGST 18%', taxRate: 18,
    }],
    totalInWords: '',
    paymentCommunication: no,
    ...webnxtBase,
  });
};
