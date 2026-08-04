import { forwardRef } from "react";
import {
  ClientInvoice, formatInvoiceDate, formatINR, formatINRPlain,
  calcUntaxed, calcIgst, calcTotal, calcLineTotal, buildHsnSummary,
  formatCurrency, formatCurrencyPlain, CurrencyCode,
} from "@/lib/invoiceUtils";
import { PAYMENT_APP_LOGOS } from "./paymentLogos";
import { PaymentAppBadge } from "./PaymentAppBadge";
import { getPaymentQrImage } from "./paymentQrOptions";
import { PaymentQrBox } from "./PaymentQrBox";

interface InvoiceDocumentProps {
  invoice: ClientInvoice;
  className?: string;
  editableQr?: boolean;
  onQrUpload?: (file: File) => void;
}

export const InvoiceDocument = forwardRef<HTMLDivElement, InvoiceDocumentProps>(
  ({ invoice, className = "", editableQr, onQrUpload }, ref) => {
    const untaxed = calcUntaxed(invoice.lineItems);
    const igst = calcIgst(invoice.lineItems);
    const total = calcTotal(invoice.lineItems);
    const hsnRows = buildHsnSummary(invoice.lineItems);
    const qrImage = getPaymentQrImage(invoice);
    const currency = invoice.currency || "INR";
    const fmt = (n: number) => formatCurrency(n, currency);
    const fmtPlain = (n: number) => formatCurrencyPlain(n, currency);

    return (
      <div
        ref={ref}
        className={`bg-white text-[#333] w-full max-w-[794px] mx-auto ${className}`}
        style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "13px" }}
      >
        {/* Header */}
        <div className="flex border-b border-gray-300">
          <div className="w-[40%] bg-[#f0f0f0] p-5 flex flex-col justify-center border-r border-gray-300">
            <div className="bg-white border border-gray-200 p-3 inline-block w-fit mb-3">
              {invoice.companyLogo ? (
                <img
                  src={invoice.companyLogo}
                  alt={invoice.companyName || "Company Logo"}
                  className="block"
                  style={{
                    width: 90,
                    height: "auto",
                    maxHeight: 60,
                    objectFit: "contain",
                    objectPosition: "left center",
                  }}
                />
              ) : (
                <img
                  src="/webnxt-logo.png"
                  alt="Company Logo"
                  className="block"
                  style={{
                    width: 90,
                    height: "auto",
                    objectFit: "contain",
                    objectPosition: "left center",
                  }}
                  onError={e => { e.currentTarget.src = "/webnxt-logo.svg"; }}
                />
              )}
            </div>
            {invoice.companyName && (
              <p className="text-[14px] font-bold text-gray-900 mb-1">{invoice.companyName}</p>
            )}
            <p className="text-[11px] text-gray-600 italic leading-snug pr-2 max-w-[220px]">
              {invoice.companyTagline}
            </p>
          </div>
          <div className="flex-1 p-5 flex flex-col items-end justify-start text-right text-[12px] text-gray-700 leading-relaxed">
            <p>{invoice.companyAddressLine1}</p>
            <p>{invoice.companyAddressLine2}</p>
            <p>{invoice.companyAddressLine3}</p>
            <p className="mt-1"><strong>GSTIN:</strong> {invoice.companyGstin}</p>
          </div>
        </div>

        {/* Tax Invoice title */}
        <div className="bg-[#e8e8e8] px-5 py-3 border-b border-gray-300">
          <h1 className="text-[22px] font-bold text-[#2c3e6b] tracking-tight">
            {invoice.taxInvoiceTitle}
          </h1>
        </div>

        {/* Client billing */}
        <div className="px-5 py-4 border-b border-gray-200 text-[12px] leading-relaxed">
          <p className="font-semibold text-gray-900">{invoice.clientName}</p>
          <p className="text-gray-700">{invoice.clientAddress}</p>
          <p className="text-gray-700"><strong>GSTIN:</strong> {invoice.clientGstin}</p>
          <p className="text-gray-700"><strong>Place of supply:</strong> {invoice.placeOfSupply}</p>
        </div>

        {/* Date row */}
        <div className="grid grid-cols-4 border-b border-gray-300 text-[11px]">
          {[
            { label: "Invoice Date", value: formatInvoiceDate(invoice.invoiceDate) },
            { label: "Due Date", value: formatInvoiceDate(invoice.dueDate) },
            { label: "Source", value: invoice.source },
            { label: "Reference", value: invoice.reference },
          ].map((col, i) => (
            <div key={col.label} className={`px-4 py-2.5 ${i < 3 ? "border-r border-gray-300" : ""}`}>
              <p className="font-bold text-gray-800 mb-0.5">{col.label}</p>
              <p className="text-gray-700">{col.value}</p>
            </div>
          ))}
        </div>

        {/* Line items */}
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="text-left py-2 px-4 font-bold text-gray-900">Description</th>
              <th className="text-left py-2 px-2 font-bold text-gray-900 w-20">HSN/SAC</th>
              <th className="text-right py-2 px-2 font-bold text-gray-900 w-24">Quantity</th>
              <th className="text-right py-2 px-2 font-bold text-gray-900 w-24">Unit Price</th>
              <th className="text-left py-2 px-2 font-bold text-gray-900 w-24">Taxes</th>
              <th className="text-right py-2 px-4 font-bold text-gray-900 w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map(item => (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="py-2.5 px-4 text-gray-800">{item.description}</td>
                <td className="py-2.5 px-2 text-gray-700">{item.hsnSac}</td>
                <td className="py-2.5 px-2 text-right text-gray-700">{item.qty.toFixed(2)} Units</td>
                <td className="py-2.5 px-2 text-right text-gray-700">{fmtPlain(item.unitPrice)}</td>
                <td className="py-2.5 px-2 text-gray-700">{item.taxLabel}</td>
                <td className="py-2.5 px-4 text-right text-gray-900">{fmt(calcLineTotal(item))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals + Payment */}
        <div className="flex border-b border-gray-300">
          {(invoice.showPaymentQr || invoice.showBankDetails) && (
            <div className="w-[55%] p-4 border-r border-gray-300 text-[11px]">
              <p className="text-gray-700 mb-3">
                Payment Communication: <strong>{invoice.paymentCommunication}</strong> on this account:{" "}
                <strong>{invoice.paymentAccount}</strong>
              </p>
              
              <div className="flex gap-4 items-start">
                {invoice.showPaymentQr && (
                  <div className="flex gap-3 items-start flex-1">
                    <PaymentQrBox src={qrImage} editable={editableQr} onUpload={onQrUpload} />
                    <div className="min-w-0 pt-0.5">
                      <p className="font-bold text-gray-800 text-[12px] mb-0.5 leading-tight">PAYMENT QR</p>
                      <p className="text-gray-700 leading-tight"><strong>UPI ID:</strong> {invoice.upiId}</p>
                      <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                        {PAYMENT_APP_LOGOS.map(app => (
                          <PaymentAppBadge key={app.id} label={app.label} logo={app.logo} height={app.height} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {invoice.showBankDetails && (
                  <div className={`flex-1 min-w-0 pt-0.5 ${invoice.showPaymentQr ? 'border-l border-gray-200 pl-4' : ''}`}>
                     <p className="font-bold text-gray-800 text-[12px] mb-1.5 leading-tight">BANK DETAILS</p>
                     <p className="text-gray-700 leading-tight mb-0.5"><strong>Bank:</strong> {invoice.bankName}</p>
                     <p className="text-gray-700 leading-tight mb-0.5"><strong>Name:</strong> {invoice.bankAccountName}</p>
                     <p className="text-gray-700 leading-tight mb-0.5"><strong>A/C No:</strong> {invoice.bankAccountNumber}</p>
                     <p className="text-gray-700 leading-tight"><strong>IFSC:</strong> {invoice.bankIfsc}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={`${(invoice.showPaymentQr || invoice.showBankDetails) ? "w-[45%]" : "w-full"} p-4 text-[12px]`}>
            <div className="space-y-1.5 ml-auto max-w-[240px]">
              <div className="flex justify-between text-gray-700">
                <span>Untaxed Amount</span>
                <span>{fmt(untaxed)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>IGST</span>
                <span>{fmt(igst)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-[13px] pt-1 border-t border-gray-400">
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-4 italic leading-relaxed">
              Total amount in words: {invoice.totalInWords || "—"}
            </p>
          </div>
        </div>

        {/* HSN Summary */}
        {invoice.showHsnSummary && hsnRows.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-300">
            <p className="font-bold text-gray-900 text-[12px] mb-2">HSN Summary</p>
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-gray-400">
                  <th className="text-left py-1.5 px-2 font-bold">HSN/SAC</th>
                  <th className="text-right py-1.5 px-2 font-bold">Quantity</th>
                  <th className="text-right py-1.5 px-2 font-bold">Rate %</th>
                  <th className="text-right py-1.5 px-2 font-bold">Taxable Value</th>
                  <th className="text-right py-1.5 px-2 font-bold">IGST</th>
                </tr>
              </thead>
              <tbody>
                {hsnRows.map(row => (
                  <tr key={`${row.hsnSac}-${row.ratePercent}`} className="border-b border-gray-200">
                    <td className="py-1.5 px-2">{row.hsnSac}</td>
                    <td className="py-1.5 px-2 text-right">{row.quantity.toFixed(1)} Units</td>
                    <td className="py-1.5 px-2 text-right">{row.ratePercent.toFixed(1)}</td>
                    <td className="py-1.5 px-2 text-right">{fmt(row.taxableValue)}</td>
                    <td className="py-1.5 px-2 text-right">{fmt(row.igst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center px-5 py-3 text-[11px] text-gray-600 border-t border-gray-300">
          <span>{invoice.footerEmail}</span>
          <span className="text-blue-600">{invoice.footerWebsite}</span>
          <span>Page 1 / 1</span>
        </div>
      </div>
    );
  },
);

InvoiceDocument.displayName = "InvoiceDocument";
