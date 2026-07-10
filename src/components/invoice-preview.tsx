import React, { useMemo } from "react";
import { X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Quotation, LineItem } from "@/lib/queries";
import logo from "@/assets/logo.png";

function amountToWords(amount: number): string {
  if (amount === 0) return "Zero Rupees Only";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const inWords = (num: number): string => {
    if (num === 0) return "";
    if (num < 20) return a[num] + " ";
    if (num < 100) return b[Math.floor(num / 10)] + " " + inWords(num % 10);
    if (num < 1000) return a[Math.floor(num / 100)] + " Hundred " + inWords(num % 100);
    if (num < 100000) return inWords(Math.floor(num / 1000)) + "Thousand " + inWords(num % 1000);
    if (num < 10000000) return inWords(Math.floor(num / 100000)) + "Lakh " + inWords(num % 100000);
    return inWords(Math.floor(num / 10000000)) + "Crore " + inWords(num % 10000000);
  };
  
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let res = inWords(rupees).trim() + " Rupees";
  if (paise > 0) res += " and " + inWords(paise).trim() + " Paise";
  return res + " Only";
}

export function InvoicePreview({ invoice: q, onClose, embedded }: { invoice: Quotation; onClose?: () => void; embedded?: boolean }) {
  const ef = q.extra_fields || {};
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const fmt = (num: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(num);

  const lineNet = (i: LineItem) => i.qty * i.unit_price;
  const sub = q.line_items.reduce((s, i) => s + lineNet(i), 0);
  const taxAmt = sub * (q.tax_rate / 100);
  const total = sub + taxAmt;

  const hsnSummary = useMemo(() => {
    const map = new Map<string, { qty: number, taxable: number, igst: number, unit: string }>();
    q.line_items.forEach(i => {
      const hsn = i.hsn_sac || "—";
      const net = lineNet(i);
      const igst = net * (q.tax_rate / 100);
      const ex = map.get(hsn) || { qty: 0, taxable: 0, igst: 0, unit: i.unit };
      map.set(hsn, { qty: ex.qty + i.qty, taxable: ex.taxable + net, igst: ex.igst + igst, unit: i.unit });
    });
    return Array.from(map.entries()).map(([hsn, data]) => ({ hsn, ...data }));
  }, [q.line_items, q.tax_rate]);

  const handlePrint = () => {
    const el = document.getElementById("q-print");
    if (!el) return;
    const win = window.open("", "", "height=800,width=800");
    if (!win) return;
    win.document.write(`<html><head>
      <title>${q.quotation_number}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { size: A4; margin: 10mm; }
        @media print {
          body { background: white; }
        }
      </style>
    </head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  const content = (
    <div className={`bg-white flex flex-col ${embedded ? 'w-full h-full' : 'rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh]'}`} onClick={embedded ? undefined : (e) => e.stopPropagation()}>
      {!embedded && (
        <div className="flex items-center justify-between px-6 py-3 border-b shrink-0">
          <span className="font-bold text-base">{q.quotation_number}</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Print / PDF
            </Button>
            {onClose && (
              <button onClick={onClose} className="h-8 w-8 rounded-full hover:bg-muted grid place-items-center">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className={embedded ? "flex-1" : "overflow-y-auto flex-1"}>
          <div id="q-print" className="p-6 text-sm text-gray-800">
            <div className="flex items-start justify-between pb-4 border-b-2 border-gray-200">
              <div>
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 inline-block mb-2 shadow-sm">
                  <img src={logo} alt="Logo" style={{ height: "40px", width: "auto", objectFit: "contain", display: "block" }} />
                </div>
                {ef.company_tagline && <p className="text-[11px] text-gray-500 mt-1 italic">{ef.company_tagline}</p>}
              </div>
              <div className="text-right text-[11px] text-gray-600 leading-relaxed">
                {ef.company_address && <p>{ef.company_address}</p>}
                {ef.company_gstin && <p>GSTIN: {ef.company_gstin}</p>}
              </div>
            </div>

            <h1 className="text-xl font-bold text-gray-900 py-3 border-b border-gray-200">
              Invoice {q.quotation_number}
            </h1>

            <div className="py-3">
              <p className="font-bold text-sm">{q.client_name}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">GSTIN: {ef.client_gstin || ""}</p>
              <p className="text-[11px] text-gray-500">Place of supply: {ef.place_of_supply || ""}</p>
            </div>

            <div className="grid grid-cols-4 border border-gray-200 rounded-none overflow-hidden text-xs mb-3">
              {[
                { label: "Issue Date", value: fmtDate(q.issue_date) },
                { label: "Due Date", value: fmtDate(q.valid_until) },
                { label: "Source", value: ef.source || "—" },
                { label: "Reference", value: ef.reference_no || "—" },
              ].map((cell, i) => (
                <div key={i} className={`px-3 py-2 ${i < 3 ? "border-r border-gray-200" : ""}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{cell.label}</p>
                  <p className="font-semibold text-gray-800">{cell.value}</p>
                </div>
              ))}
            </div>

            <table className="w-full border border-gray-200 text-xs rounded-none">
              <thead className="bg-gray-50">
                <tr className="text-[10px] uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-2 text-left font-semibold border-b border-gray-200">Description</th>
                  <th className="px-3 py-2 text-left font-semibold border-b border-gray-200">HSN/SAC</th>
                  <th className="px-3 py-2 text-left font-semibold border-b border-gray-200">Quantity</th>
                  <th className="px-3 py-2 text-left font-semibold border-b border-gray-200">Unit Price</th>
                  <th className="px-3 py-2 text-left font-semibold border-b border-gray-200">Taxes</th>
                  <th className="px-3 py-2 text-right font-semibold border-b border-gray-200">Amount</th>
                </tr>
              </thead>
              <tbody>
                {q.line_items.map((item, idx) => {
                  const net = lineNet(item);
                  return (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="px-3 py-2">{item.description || "—"}</td>
                      <td className="px-3 py-2 text-gray-500">{item.hsn_sac || "—"}</td>
                      <td className="px-3 py-2">{item.qty.toFixed(2)} {item.unit}</td>
                      <td className="px-3 py-2">{fmt(item.unit_price)}</td>
                      <td className="px-3 py-2">IGST {q.tax_rate}%</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt(net)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex gap-4 mt-3">
              <div className="flex-1 text-xs">
                {(ef.payment_phone || ef.upi_id) && (
                  <div className="border border-gray-200 rounded-none p-3 bg-gray-50">
                    {ef.payment_phone && (
                      <p className="text-[11px] text-gray-600 mb-2">
                        Payment Communication: <span className="font-semibold">{q.quotation_number}</span> on this account:{" "}
                        <span className="font-semibold">{ef.payment_phone}</span>
                      </p>
                    )}
                    {ef.upi_id && (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Payment QR Code</p>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-16 h-16 border-2 border-dashed border-gray-300 flex items-center justify-center text-[9px] text-gray-400 text-center leading-tight rounded">
                            QR CODE
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500">UPI ID:</p>
                            <p className="text-xs font-semibold">{ef.upi_id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {["PhonePe", "Google Pay", "Paytm", "BHIM"].map((app) => (
                            <span key={app} className="text-[9px] bg-white border border-gray-200 rounded px-1.5 py-0.5 font-medium text-gray-600">{app}</span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="w-52 text-xs">
                <div className="border border-gray-200 rounded-none">
                  {[
                    { label: "Untaxed Amount", value: fmt(sub) },
                    { label: `IGST`, value: fmt(taxAmt) },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between px-3 py-2 border-b border-gray-100">
                      <span className="text-gray-600">{row.label}</span>
                      <span className="font-semibold">{row.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-3 py-2 bg-gray-50 font-bold">
                    <span>Total</span>
                    <span className="text-primary">{fmt(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 bg-gray-50 border border-gray-200 rounded-none px-3 py-2 text-[11px] text-gray-600 italic">
              Total amount in words: <span className="font-semibold not-italic text-gray-800">{amountToWords(total)}</span>
            </div>

            <div className="mt-5">
              <h3 className="font-bold text-sm mb-2">HSN Summary</h3>
              <table className="w-full border border-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr className="text-[10px] uppercase tracking-wider text-gray-500">
                    <th className="px-3 py-2 text-left font-semibold border-b border-gray-200">HSN/SAC</th>
                    <th className="px-3 py-2 text-left font-semibold border-b border-gray-200">Quantity</th>
                    <th className="px-3 py-2 text-left font-semibold border-b border-gray-200">Rate %</th>
                    <th className="px-3 py-2 text-left font-semibold border-b border-gray-200">Taxable Value</th>
                    <th className="px-3 py-2 text-left font-semibold border-b border-gray-200">IGST</th>
                  </tr>
                </thead>
                <tbody>
                  {hsnSummary.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="px-3 py-2">{row.hsn}</td>
                      <td className="px-3 py-2">{row.qty.toFixed(1)} {row.unit}</td>
                      <td className="px-3 py-2">{q.tax_rate.toFixed(1)}</td>
                      <td className="px-3 py-2">{fmt(row.taxable)}</td>
                      <td className="px-3 py-2">{fmt(row.igst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 pt-3 border-t border-gray-200 flex justify-between items-center text-[11px] text-gray-500">
              <span>{ef.company_email || ""}</span>
              <span>{ef.company_website || ""}</span>
              <span>Page 1 / 1</span>
            </div>

          </div>
        </div>
      </div>
  );

  if (embedded) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      {content}
    </div>
  );
}
