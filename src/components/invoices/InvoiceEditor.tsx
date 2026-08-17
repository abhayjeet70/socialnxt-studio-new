import { useState, useRef } from "react";
import { ArrowLeft, Download, Save, Plus, Trash2, Eye, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  ClientInvoice, InvoiceLineItem, INVOICE_STATUSES, InvoiceStatus,
  syncInvoiceAmount, formatINR, TAX_RATE_OPTIONS, applyTaxRateToItems,
  calcLineTotal, calcLineTax, getTaxSummary, taxLabelFor,
  CURRENCY_OPTIONS, CurrencyCode, formatCurrency,
} from "@/lib/invoiceUtils";
import { InvoiceDocument } from "./InvoiceDocument";
import { exportInvoicePdf } from "@/lib/exportInvoicePdf";
import { PAYMENT_QR_OPTIONS, getPaymentQrOption, CUSTOM_QR_ID } from "./paymentQrOptions";
import { readPaymentQrFile } from "./paymentQrUpload";

const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-[11px] font-semibold text-gray-600 mb-1 block">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-700 py-1">
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-4 h-4 rounded accent-indigo-600" />
    {label}
  </label>
);

interface InvoiceEditorProps {
  invoice: ClientInvoice;
  isNew?: boolean;
  readonly?: boolean;
  onSave: (invoice: ClientInvoice) => void;
  onBack: () => void;
}

const InvoiceEditor = ({ invoice: initial, isNew, readonly, onSave, onBack }: InvoiceEditorProps) => {
  const [form, setForm] = useState<ClientInvoice>(() => ({
    ...initial,
    currency: initial.currency || "INR",
    paymentQrId: initial.paymentQrId ?? "primary",
    lineItems: initial.lineItems.map(li => ({ ...li })),
  }));
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const qrFileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ClientInvoice>(k: K, v: ClientInvoice[K]) =>
    setForm(prev => syncInvoiceAmount({ ...prev, [k]: v }));

  const setLineItem = (id: string, patch: Partial<InvoiceLineItem>) => {
    setForm(prev => {
      const lineItems = prev.lineItems.map(li => {
        if (li.id !== id) return li;
        const updated = { ...li, ...patch };
        if (patch.taxRate !== undefined) updated.taxLabel = taxLabelFor(patch.taxRate);
        return updated;
      });
      return syncInvoiceAmount({ ...prev, lineItems });
    });
  };

  const applyTaxToAll = (rate: number) => {
    setForm(prev => syncInvoiceAmount({
      ...prev,
      lineItems: applyTaxRateToItems(prev.lineItems, rate),
    }));
    toast.success(`Applied ${taxLabelFor(rate)} to all line items`);
  };

  const setPaymentQr = (id: string) => {
    if (id === CUSTOM_QR_ID) {
      setForm(prev => syncInvoiceAmount({ ...prev, paymentQrId: CUSTOM_QR_ID }));
      return;
    }
    const opt = getPaymentQrOption(id);
    setForm(prev => syncInvoiceAmount({
      ...prev,
      paymentQrId: id,
      paymentQrCustomImage: undefined,
      upiId: opt.upiId,
      paymentAccount: opt.accountNo,
    }));
  };

  const handleQrUpload = async (file: File) => {
    try {
      const dataUrl = await readPaymentQrFile(file);
      setForm(prev => syncInvoiceAmount({
        ...prev,
        paymentQrId: CUSTOM_QR_ID,
        paymentQrCustomImage: dataUrl,
      }));
      toast.success("QR image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const clearCustomQr = () => {
    const opt = getPaymentQrOption("primary");
    setForm(prev => syncInvoiceAmount({
      ...prev,
      paymentQrId: "primary",
      paymentQrCustomImage: undefined,
      upiId: opt.upiId,
      paymentAccount: opt.accountNo,
    }));
    toast.success("Using preset QR");
  };

  const taxSummary = getTaxSummary(form.lineItems);

  const addLineItem = () => {
    setForm(prev => syncInvoiceAmount({
      ...prev,
      lineItems: [...prev.lineItems, {
        id: String(Date.now()), description: "", hsnSac: "998361",
        qty: 1, unitPrice: 0, taxLabel: taxLabelFor(18), taxRate: 18,
      }],
    }));
  };

  const removeLineItem = (id: string) => {
    if (form.lineItems.length <= 1) { toast.error("At least one line item is required"); return; }
    setForm(prev => syncInvoiceAmount({
      ...prev,
      lineItems: prev.lineItems.filter(li => li.id !== id),
    }));
  };

  const handleSave = () => {
    if (!form.invoiceNo.trim()) { toast.error("Invoice number is required"); return; }
    if (!form.clientName.trim()) { toast.error("Client name is required"); return; }
    onSave(syncInvoiceAmount(form));
    toast.success(isNew ? "Invoice created" : "Invoice saved");
  };

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setDownloading(true);
    try {
      await exportInvoicePdf(previewRef.current, `${form.invoiceNo}.pdf`);
      toast.success("PDF downloaded successfully");
    } catch {
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </button>
        <div className="flex items-center gap-2">
          {!readonly && (
            <button type="button" onClick={handleSave} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm">
              <Save className="w-4 h-4" /> Save
            </button>
          )}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm disabled:opacity-60"
          >
            <Download className="w-4 h-4" /> {downloading ? "Generating…" : "Download PDF"}
          </button>
        </div>
      </div>

      <div className={`flex gap-5 flex-col ${readonly ? 'items-center' : 'xl:flex-row'}`}>
        {!readonly && (
          <div className="w-full xl:w-[420px] shrink-0">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4 max-h-[calc(100vh-180px)] overflow-y-scroll">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-500" /> Edit Invoice
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Invoice No *">
                <input
                  value={form.invoiceNo}
                  onChange={e => {
                    const no = e.target.value;
                    setForm(prev => syncInvoiceAmount({
                      ...prev,
                      invoiceNo: no,
                      taxInvoiceTitle: `Tax Invoice ${no}`,
                      paymentCommunication: no,
                    }));
                  }}
                  className={inputCls}
                />
              </FormField>
              <FormField label="Status">
                <select value={form.status} onChange={e => set("status", e.target.value as InvoiceStatus)} className={inputCls}>
                  {INVOICE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
            </div>

            {/* TC05: Currency Selector */}
            <FormField label="Currency">
              <select
                value={form.currency || "INR"}
                onChange={e => set("currency", e.target.value as CurrencyCode)}
                className={inputCls}
              >
                {CURRENCY_OPTIONS.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Tax Invoice Title">
              <input value={form.taxInvoiceTitle} onChange={e => set("taxInvoiceTitle", e.target.value)} className={inputCls} />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Invoice Date">
                <input type="date" value={form.invoiceDate} onChange={e => set("invoiceDate", e.target.value)} className={inputCls} />
              </FormField>
              <FormField label="Due Date">
                <input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} className={inputCls} />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Source"><input value={form.source} onChange={e => set("source", e.target.value)} className={inputCls} /></FormField>
              <FormField label="Reference"><input value={form.reference} onChange={e => set("reference", e.target.value)} className={inputCls} /></FormField>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Company</p>
              <div className="space-y-3">
                <FormField label="Company Name *"><input value={form.companyName} onChange={e => set("companyName", e.target.value)} className={inputCls} /></FormField>
                <FormField label="Tagline"><input value={form.companyTagline} onChange={e => set("companyTagline", e.target.value)} className={inputCls} /></FormField>
                <FormField label="Address Line 1"><input value={form.companyAddressLine1} onChange={e => set("companyAddressLine1", e.target.value)} className={inputCls} /></FormField>
                <FormField label="Address Line 2"><input value={form.companyAddressLine2} onChange={e => set("companyAddressLine2", e.target.value)} className={inputCls} /></FormField>
                <FormField label="Address Line 3"><input value={form.companyAddressLine3} onChange={e => set("companyAddressLine3", e.target.value)} className={inputCls} /></FormField>
                <FormField label="GSTIN"><input value={form.companyGstin} onChange={e => set("companyGstin", e.target.value)} className={inputCls} /></FormField>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Client (Bill To)</p>
              <div className="space-y-3">
                <FormField label="Client Name *"><input value={form.clientName} onChange={e => set("clientName", e.target.value)} className={inputCls} /></FormField>
                <FormField label="Address"><input value={form.clientAddress} onChange={e => set("clientAddress", e.target.value)} className={inputCls} /></FormField>
                <FormField label="Client GSTIN"><input value={form.clientGstin} onChange={e => set("clientGstin", e.target.value)} className={inputCls} /></FormField>
                <FormField label="Place of Supply"><input value={form.placeOfSupply} onChange={e => set("placeOfSupply", e.target.value)} className={inputCls} /></FormField>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Line Items</p>
                <button type="button" onClick={addLineItem} className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add Row
                </button>
              </div>

              <div className="mb-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide mb-2">Apply GST / IGST to all rows</p>
                <div className="flex flex-wrap gap-1.5">
                  {TAX_RATE_OPTIONS.map(rate => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => applyTaxToAll(rate)}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                      {taxLabelFor(rate)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {form.lineItems.map((item, idx) => {
                  const taxable = calcLineTotal(item);
                  const lineTax = calcLineTax(item);
                  const lineTotal = taxable + lineTax;
                  return (
                  <div key={item.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400">Item {idx + 1}</span>
                      <button type="button" onClick={() => removeLineItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <input placeholder="Description" value={item.description} onChange={e => setLineItem(item.id, { description: e.target.value })} className={inputCls} />
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="HSN/SAC" value={item.hsnSac} onChange={e => setLineItem(item.id, { hsnSac: e.target.value })} className={inputCls} />
                      <input type="number" min={0} step={0.01} placeholder="Qty" value={item.qty} onChange={e => setLineItem(item.id, { qty: Number(e.target.value) || 0 })} className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" min={0} placeholder="Unit Price (excl. tax)" value={item.unitPrice} onChange={e => setLineItem(item.id, { unitPrice: Number(e.target.value) || 0 })} className={inputCls} />
                      <select value={item.taxRate} onChange={e => setLineItem(item.id, { taxRate: Number(e.target.value) })} className={inputCls}>
                        {TAX_RATE_OPTIONS.map(r => <option key={r} value={r}>{taxLabelFor(r)}</option>)}
                      </select>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-200">
                      <span>Taxable: <strong className="text-gray-700">{formatCurrency(taxable, form.currency)}</strong></span>
                      <span>{item.taxLabel}: <strong className="text-gray-700">{formatCurrency(lineTax, form.currency)}</strong></span>
                      <span>Line total: <strong className="text-indigo-600">{formatCurrency(lineTotal, form.currency)}</strong></span>
                    </div>
                  </div>
                  );
                })}
              </div>

              <div className="mt-4 p-4 rounded-xl bg-slate-800 text-white space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Auto-calculated totals</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Untaxed Amount</span>
                  <span className="font-semibold">{formatCurrency(taxSummary.untaxed, form.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">
                    IGST {taxSummary.rates.length === 1 ? `(${taxSummary.rates[0]}%)` : ""}
                  </span>
                  <span className="font-semibold">{formatCurrency(taxSummary.igst, form.currency)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-600">
                  <span>Grand Total</span>
                  <span className="text-emerald-400">{formatCurrency(taxSummary.total, form.currency)}</span>
                </div>
                <p className="text-[10px] text-slate-400 italic pt-1">{form.totalInWords}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Payment</p>
              <div className="space-y-3">
                <FormField label="Payment Communication"><input value={form.paymentCommunication} onChange={e => set("paymentCommunication", e.target.value)} className={inputCls} /></FormField>
                {form.showPaymentQr && (
                  <>
                    <FormField label="Payment QR Code">
                      <select
                        value={form.paymentQrCustomImage ? CUSTOM_QR_ID : (form.paymentQrId || "primary")}
                        onChange={e => setPaymentQr(e.target.value)}
                        className={inputCls}
                      >
                        {PAYMENT_QR_OPTIONS.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                        {form.paymentQrCustomImage && (
                          <option value={CUSTOM_QR_ID}>Custom uploaded</option>
                        )}
                      </select>
                    </FormField>
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={qrFileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleQrUpload(file);
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => qrFileRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Upload QR from device
                      </button>
                      {form.paymentQrCustomImage && (
                        <button
                          type="button"
                          onClick={clearCustomQr}
                          className="px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200"
                        >
                          Use preset QR
                        </button>
                      )}
                    </div>
                  </>
                )}
                <FormField label="Account No"><input value={form.paymentAccount} onChange={e => set("paymentAccount", e.target.value)} className={inputCls} /></FormField>
                <FormField label="UPI ID"><input value={form.upiId} onChange={e => set("upiId", e.target.value)} className={inputCls} /></FormField>

                {form.showBankDetails && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl space-y-3 mt-4">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Bank Details</p>
                    <FormField label="Bank Name"><input value={form.bankName} onChange={e => set("bankName", e.target.value)} className={inputCls} /></FormField>
                    <FormField label="Account Name"><input value={form.bankAccountName} onChange={e => set("bankAccountName", e.target.value)} className={inputCls} /></FormField>
                    <FormField label="Account Number"><input value={form.bankAccountNumber} onChange={e => set("bankAccountNumber", e.target.value)} className={inputCls} /></FormField>
                    <FormField label="IFSC Code"><input value={form.bankIfsc} onChange={e => set("bankIfsc", e.target.value)} className={inputCls} /></FormField>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Optional Sections</p>
              <Toggle label="Show Payment QR Code" checked={form.showPaymentQr} onChange={v => set("showPaymentQr", v)} />
              <Toggle label="Show Bank Details" checked={form.showBankDetails} onChange={v => set("showBankDetails", v)} />
              <Toggle label="Show HSN Summary" checked={form.showHsnSummary} onChange={v => set("showHsnSummary", v)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Footer Email"><input value={form.footerEmail} onChange={e => set("footerEmail", e.target.value)} className={inputCls} /></FormField>
              <FormField label="Footer Website"><input value={form.footerWebsite} onChange={e => set("footerWebsite", e.target.value)} className={inputCls} /></FormField>
            </div>
          </div>
        </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="bg-gray-200 rounded-2xl border border-gray-300 p-4 xl:p-6 overflow-auto max-h-[calc(100vh-180px)]">
            <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide mb-3 text-center">
              Live Preview — exact PDF layout
            </p>
            <InvoiceDocument
              ref={previewRef}
              invoice={form}
              className="shadow-xl"
              editableQr
              onQrUpload={handleQrUpload}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceEditor;
