import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Plus, Loader2, FileText, Trash2, Eye, Printer, X,
  Receipt, BellRing, Send, Edit3
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import {
  useCurrentWorkspace, useQuotations, useCreateQuotation, useUpdateQuotation,
  useUpdateQuotationStatus, useDeleteQuotation, useClients,
  useWorkspaceMembers, Quotation, LineItem,
} from "@/lib/queries";

export const Route = createFileRoute("/quotations")({
  head: () => ({ meta: [{ title: "Quotations — SocialNxt CRM" }] }),
  component: QuotationsPage,
});

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUS_TONE: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Sent: "bg-primary/10 text-primary",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
};
const TRANSACTION_TYPES = ["New", "Renewal", "Upgrade", "Custom"];
const SERVICE_TYPES = [
  "Social Media Management", "Content Creation", "Paid Advertising",
  "SEO / SEM", "Email Marketing", "Influencer Marketing",
  "Brand Strategy", "Website Design", "WhatsApp Marketing", "Other",
];

const EMPTY_LINE: LineItem = {
  description: "", unit: "Units", qty: 1,
  unit_price: 0, discount: 0, hsn_sac: "",
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function lineNet(item: LineItem) {
  const gross = item.qty * item.unit_price;
  return gross - (gross * item.discount) / 100;
}
function subtotal(items: LineItem[]) {
  return items.reduce((s, i) => s + lineNet(i), 0);
}
function fmt(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Amount in Words ────────────────────────────────────────────────────────────
function amountToWords(amount: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function toW(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n] + " ";
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "") + " ";
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred " + toW(n % 100);
    if (n < 100000) return toW(Math.floor(n / 1000)) + "Thousand " + toW(n % 1000);
    if (n < 10000000) return toW(Math.floor(n / 100000)) + "Lakh " + toW(n % 100000);
    return toW(Math.floor(n / 10000000)) + "Crore " + toW(n % 10000000);
  }

  const r = Math.round(amount * 100) / 100;
  const rupees = Math.floor(r);
  const paise = Math.round((r - rupees) * 100);
  let out = "";
  if (rupees > 0) out += toW(rupees).trim() + " Rupees";
  if (paise > 0) out += (rupees > 0 ? " and " : "") + toW(paise).trim() + " Paise";
  return (out || "Zero Rupees") + " Only";
}

// ── Main Page ──────────────────────────────────────────────────────────────────
function QuotationsPage() {
  const { data: workspace } = useCurrentWorkspace();
  const { data: quotationsAll = [], isLoading } = useQuotations(workspace?.workspaceId);
  const { data: clients = [] } = useClients(workspace?.workspaceId);
  const { data: members = [] } = useWorkspaceMembers(workspace?.workspaceId);
  const createQuotation = useCreateQuotation();
  const updateQuotation = useUpdateQuotation();
  const updateStatus = useUpdateQuotationStatus();
  const deleteQuotation = useDeleteQuotation();

  const isAdmin = workspace?.role === "admin";
  const isClient = workspace?.role === "client";
  const clientName = workspace?.userFullName || workspace?.userEmail?.split("@")[0] || "";
  const canEdit = workspace?.role === "admin" || workspace?.role === "employee";

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");

  const quotations = useMemo(() => {
    let filtered = quotationsAll.filter(q => !q.quotation_number.startsWith("INV-"));
    filtered = isClient 
      ? filtered.filter(q => q.client_name?.toLowerCase() === clientName.toLowerCase() && q.status !== "Draft")
      : filtered;

    return filtered.filter(q => {
      if (filterStatus !== "all" && q.status !== filterStatus) return false;
      if (!isClient && filterClient !== "all" && q.client_name !== filterClient) return false;
      return true;
    });
  }, [quotationsAll, isClient, clientName, filterStatus, filterClient]);

  const allClientNames = useMemo(() => {
    const closedClientNames = new Set(clients.filter(c => c.status === "Closed").map(c => c.name.toLowerCase()));
    const closedClientEmails = new Set(clients.filter(c => c.status === "Closed" && c.email).map(c => c.email!.toLowerCase()));

    const names = new Set(clients.filter(c => c.status !== "Closed").map((c) => c.name));
    members.filter((m) => m.role === "client").forEach((m) => {
      const n = m.users?.full_name || m.users?.email?.split("@")[0];
      const email = m.users?.email?.toLowerCase();
      const isClosedByName = n && closedClientNames.has(n.toLowerCase());
      const isClosedByEmail = email && closedClientEmails.has(email);
      
      if (n && !isClosedByName && !isClosedByEmail) {
        names.add(n);
      }
    });
    return Array.from(names).sort();
  }, [clients, members]);

  const employees = useMemo(
    () => members.filter((m) => m.role === "employee" || m.role === "admin"),
    [members]
  );

  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Quotation | null>(null);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);

  const defaultForm = () => ({
    // Client
    client_name: "",
    client_gstin: "",
    place_of_supply: "",
    // Details
    source: "",
    reference_no: "",
    issue_date: new Date().toISOString().slice(0, 10),
    valid_until: "",
    service_type: null as string | null,
    transaction_type: null as string | null,
    // Assignment
    assigned_to: null as string | null,
    notify_admin: false,
    // Line items
    line_items: [{ ...EMPTY_LINE }] as LineItem[],
    tax_rate: 18,
    notes: "",
    status: "Draft" as Quotation["status"],
    // Payment
    upi_id: "",
    payment_phone: "",
    // Company
    company_address: "3467-E Sudama Nagar Indore, Indore 452009, Madhya Pradesh MP, India",
    company_gstin: "",
    company_tagline: "Transform your Brand with Digital Excellence",
    company_email: "support@webnxt.co",
    company_website: "http://www.webnxt.co",
  });

  const [form, setForm] = useState(defaultForm());

  const sub = subtotal(form.line_items);
  const taxAmt = (sub * form.tax_rate) / 100;
  const total = sub + taxAmt;

  const updateLine = (idx: number, key: keyof LineItem, val: string | number) => {
    setForm((f) => {
      const items = [...f.line_items];
      const numKeys: (keyof LineItem)[] = ["qty", "unit_price", "discount"];
      items[idx] = {
        ...items[idx],
        [key]: numKeys.includes(key) ? (parseFloat(val as string) || 0) : val,
      };
      return { ...f, line_items: items };
    });
  };
  const addLine = () => setForm((f) => ({ ...f, line_items: [...f.line_items, { ...EMPTY_LINE }] }));
  const removeLine = (idx: number) =>
    setForm((f) => ({ ...f, line_items: f.line_items.filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    if (!form.client_name) return toast.error("Please select a client.");
    if (form.line_items.length === 0) return toast.error("Add at least one line item.");
    if (!workspace?.userId) return;

    if (editingQuotation) {
      updateQuotation.mutate(
        {
          id: editingQuotation.id,
          workspace_id: workspace.workspaceId,
          client_name: form.client_name,
          assigned_to: form.assigned_to,
          notify_admin: form.notify_admin,
          service_type: form.service_type,
          transaction_type: form.transaction_type,
          issue_date: form.issue_date || null,
          valid_until: form.valid_until || null,
          line_items: form.line_items,
          tax_rate: form.tax_rate,
          notes: form.notes || null,
          status: form.status,
          extra_fields: {
            client_gstin: form.client_gstin,
            place_of_supply: form.place_of_supply,
            source: form.source,
            reference_no: form.reference_no,
            upi_id: form.upi_id,
            payment_phone: form.payment_phone,
            company_address: form.company_address,
            company_gstin: form.company_gstin,
            company_tagline: form.company_tagline,
            company_email: form.company_email,
            company_website: form.company_website,
          },
        },
        {
          onSuccess: () => {
            toast.success("Quotation updated!");
            setOpen(false);
            setEditingQuotation(null);
            setForm(defaultForm());
          },
          onError: (e: any) => toast.error("Failed: " + e.message),
        }
      );
    } else {
      createQuotation.mutate(
        {
          workspace_id: workspace.workspaceId,
          created_by: workspace.userId,
          client_name: form.client_name,
          assigned_to: form.assigned_to,
          notify_admin: form.notify_admin,
          service_type: form.service_type,
          transaction_type: form.transaction_type,
          issue_date: form.issue_date || null,
          valid_until: form.valid_until || null,
          line_items: form.line_items,
          tax_rate: form.tax_rate,
          notes: form.notes || null,
          status: form.status,
          extra_fields: {
            client_gstin: form.client_gstin,
            place_of_supply: form.place_of_supply,
            source: form.source,
            reference_no: form.reference_no,
            upi_id: form.upi_id,
            payment_phone: form.payment_phone,
            company_address: form.company_address,
            company_gstin: form.company_gstin,
            company_tagline: form.company_tagline,
            company_email: form.company_email,
            company_website: form.company_website,
          },
        },
        {
          onSuccess: () => {
            toast.success("Quotation created!");
            setOpen(false);
            setForm(defaultForm());
          },
          onError: (e: any) => toast.error("Failed: " + e.message),
        }
      );
    }
  };

  const handleEdit = (q: Quotation) => {
    setEditingQuotation(q);
    setForm({
      client_name: q.client_name,
      client_gstin: q.extra_fields?.client_gstin || "",
      place_of_supply: q.extra_fields?.place_of_supply || "",
      source: q.extra_fields?.source || "",
      reference_no: q.extra_fields?.reference_no || "",
      issue_date: q.issue_date || "",
      valid_until: q.valid_until || "",
      service_type: q.service_type,
      transaction_type: q.transaction_type,
      assigned_to: q.assigned_to,
      notify_admin: q.notify_admin,
      line_items: [...q.line_items],
      tax_rate: q.tax_rate,
      notes: q.notes || "",
      status: q.status,
      upi_id: q.extra_fields?.upi_id || "",
      payment_phone: q.extra_fields?.payment_phone || "",
      company_address: q.extra_fields?.company_address || "3467-E Sudama Nagar Indore, Indore 452009, Madhya Pradesh MP, India",
      company_gstin: q.extra_fields?.company_gstin || "",
      company_tagline: q.extra_fields?.company_tagline || "Transform your Brand with Digital Excellence",
      company_email: q.extra_fields?.company_email || "support@webnxt.co",
      company_website: q.extra_fields?.company_website || "http://www.webnxt.co",
    });
    setOpen(true);
  };

  const handleStatusChange = (q: Quotation, newStatus: string) => {
    if (!workspace) return;
    updateStatus.mutate(
      { id: q.id, status: newStatus, workspace_id: workspace.workspaceId },
      {
        onSuccess: () => toast.success(`Marked as ${newStatus}.`),
        onError: (e: any) => toast.error("Failed: " + e.message),
      }
    );
  };

  const handleDelete = (q: Quotation) => {
    if (!confirm(`Delete quotation ${q.quotation_number}?`)) return;
    deleteQuotation.mutate(
      { id: q.id },
      {
        onSuccess: () => toast.success("Quotation deleted."),
        onError: (e: any) => toast.error("Failed: " + e.message),
      }
    );
  };

  const livePreviewMock: Quotation = useMemo(() => {
    return {
      id: editingQuotation?.id || "mock-id",
      workspace_id: workspace?.workspaceId || "",
      created_by: editingQuotation?.created_by || workspace?.userId || "",
      quotation_number: editingQuotation?.quotation_number || "Q-NEW",
      client_name: form.client_name,
      assigned_to: form.assigned_to,
      notify_admin: form.notify_admin,
      service_type: form.service_type,
      transaction_type: form.transaction_type,
      issue_date: form.issue_date || new Date().toISOString(),
      valid_until: form.valid_until,
      line_items: form.line_items,
      tax_rate: form.tax_rate,
      notes: form.notes,
      status: form.status as Quotation["status"],
      created_at: editingQuotation?.created_at || new Date().toISOString(),
      updated_at: editingQuotation?.updated_at || new Date().toISOString(),
      extra_fields: {
        company_address: form.company_address,
        company_gstin: form.company_gstin,
        company_tagline: form.company_tagline,
        company_email: form.company_email,
        company_website: form.company_website,
        client_gstin: form.client_gstin,
        place_of_supply: form.place_of_supply,
        source: form.source,
        reference_no: form.reference_no,
        upi_id: form.upi_id,
        payment_phone: form.payment_phone,
      },
    };
  }, [editingQuotation, workspace, form]);

  return (
    <AppShell
      title="Quotations"
      subtitle="Create, assign and track detailed service quotations for your clients."
      actions={
        canEdit ? (
          <Button className="rounded-xl h-10" onClick={() => {
            setEditingQuotation(null);
            setForm(defaultForm());
            setOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-1" /> New Quotation
          </Button>
        ) : undefined
      }
    >
      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="card-soft p-4 sm:p-5">
        {quotationsAll.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {["Draft", "Sent", "Approved", "Rejected"].map((s) => {
                    if (isClient && s === "Draft") return null;
                    return <SelectItem key={s} value={s}>{s}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            {!isClient && allClientNames.length > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Client</Label>
                <Select value={filterClient} onValueChange={setFilterClient}>
                  <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="All Clients" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {allClientNames.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : quotations.length === 0 ? (
          <div className="py-20 text-center">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-semibold text-lg mb-2">No quotations yet</p>
            <p className="text-sm text-muted-foreground mb-6">
              Create a detailed quotation with line-item breakdowns, HSN codes, and tax.
            </p>
            {canEdit && (
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Create First Quotation
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="px-3 py-3 font-semibold">Quotation #</th>
                  <th className="px-3 py-3 font-semibold">Client</th>
                  <th className="px-3 py-3 font-semibold">Service Type</th>
                  <th className="px-3 py-3 font-semibold">Transaction</th>
                  <th className="px-3 py-3 font-semibold">Total</th>
                  <th className="px-3 py-3 font-semibold">Valid Until</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => {
                  const sub2 = subtotal(q.line_items);
                  const tot = sub2 + (sub2 * q.tax_rate) / 100;
                  return (
                    <tr key={q.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <span className="font-semibold">{q.quotation_number}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-foreground/80">{q.client_name}</td>
                      <td className="px-3 py-3 text-foreground/80">{q.service_type || "—"}</td>
                      <td className="px-3 py-3 text-foreground/80">{q.transaction_type || "—"}</td>
                      <td className="px-3 py-3 font-semibold">{fmt(tot)}</td>
                      <td className="px-3 py-3 text-foreground/80">{fmtDate(q.valid_until)}</td>
                      <td className="px-3 py-3">
                        {canEdit && (q.status === "Draft" || q.status === "Sent") ? (
                          <select
                            value={q.status}
                            onChange={(e) => handleStatusChange(q, e.target.value)}
                            className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${STATUS_TONE[q.status]}`}
                          >
                            {["Draft", "Sent"].map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <Badge className={`rounded-full border-0 text-xs ${STATUS_TONE[q.status]}`}>{q.status}</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Preview"
                            onClick={() => setPreview(q)}
                            className="h-8 w-8 rounded-lg hover:bg-muted grid place-items-center text-muted-foreground transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {canEdit && (
                            <>
                              <button
                                title="Edit"
                                onClick={() => handleEdit(q)}
                                className="h-8 w-8 rounded-lg hover:bg-muted grid place-items-center text-muted-foreground transition-colors"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                title="Delete"
                                onClick={() => handleDelete(q)}
                                className="h-8 w-8 rounded-lg hover:bg-red-50 text-red-500 grid place-items-center transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

            {/* ── New Quotation Dialog ──────────────────────────────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg overflow-y-auto p-0 flex flex-col bg-[#FAF9F6]">
          <SheetHeader className="px-6 py-5 border-b shrink-0 bg-white sticky top-0 z-10">
            <SheetTitle className="flex items-center gap-2 text-indigo-700">
              <Eye className="h-4 w-4" /> 
              {editingQuotation ? "Edit Quotation" : "New Quotation"}
            </SheetTitle>
            <SheetDescription className="sr-only">Fill in the details to generate a professional quotation.</SheetDescription>
          </SheetHeader>

          <div className="p-6 space-y-6 flex-1 text-sm">
            {/* Top Info */}
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Quotation No *</Label>
                <Input value={editingQuotation?.quotation_number || "Q-NEW"} disabled className="bg-white border-gray-200 shadow-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Headline</Label>
                <Input value={form.company_tagline} onChange={(e) => setForm({ ...form, company_tagline: e.target.value })} placeholder="e.g. Quotation Q-00003" className="bg-white border-gray-200 shadow-sm" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Issue Date</Label>
                <Input type="date" value={form.issue_date ?? ""} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} className="bg-white border-gray-200 shadow-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Valid Until</Label>
                <Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className="bg-white border-gray-200 shadow-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Source</Label>
                <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="bg-white border-gray-200 shadow-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Reference</Label>
                <Input value={form.reference_no} onChange={(e) => setForm({ ...form, reference_no: e.target.value })} className="bg-white border-gray-200 shadow-sm" />
              </div>
            </div>

            {/* Company */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Company</h3>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Tagline</Label>
                <Input value={form.company_tagline} onChange={(e) => setForm({ ...form, company_tagline: e.target.value })} className="bg-white border-gray-200 shadow-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Address Line 1</Label>
                <Input value={form.company_address} onChange={(e) => setForm({ ...form, company_address: e.target.value })} className="bg-white border-gray-200 shadow-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">GSTIN</Label>
                <Input value={form.company_gstin} onChange={(e) => setForm({ ...form, company_gstin: e.target.value })} className="bg-white border-gray-200 shadow-sm" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-gray-700">Email</Label>
                  <Input value={form.company_email} onChange={(e) => setForm({ ...form, company_email: e.target.value })} className="bg-white border-gray-200 shadow-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-gray-700">Website</Label>
                  <Input value={form.company_website} onChange={(e) => setForm({ ...form, company_website: e.target.value })} className="bg-white border-gray-200 shadow-sm" />
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Bill To</h3>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Client *</Label>
                {allClientNames.length > 0 ? (
                  <Select value={form.client_name} onValueChange={(v) => setForm({ ...form, client_name: v })}>
                    <SelectTrigger className="bg-white border-gray-200 shadow-sm"><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {allClientNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input placeholder="Client name" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="bg-white border-gray-200 shadow-sm" />
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-gray-700">Client GSTIN</Label>
                  <Input value={form.client_gstin} onChange={(e) => setForm({ ...form, client_gstin: e.target.value })} className="bg-white border-gray-200 shadow-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-gray-700">Place of Supply</Label>
                  <Input value={form.place_of_supply} onChange={(e) => setForm({ ...form, place_of_supply: e.target.value })} className="bg-white border-gray-200 shadow-sm" />
                </div>
              </div>
            </div>

            {/* Other Metadata */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-gray-700">Service Type</Label>
                  <Select value={form.service_type ?? ""} onValueChange={(v) => setForm({ ...form, service_type: v })}>
                    <SelectTrigger className="bg-white border-gray-200 shadow-sm"><SelectValue placeholder="Select service" /></SelectTrigger>
                    <SelectContent>{SERVICE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-gray-700">Transaction Type</Label>
                  <Select value={form.transaction_type ?? ""} onValueChange={(v) => setForm({ ...form, transaction_type: v })}>
                    <SelectTrigger className="bg-white border-gray-200 shadow-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{TRANSACTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-gray-700">Assigned To (Seller)</Label>
                  <Select value={form.assigned_to ?? ""} onValueChange={(v) => setForm({ ...form, assigned_to: v || null })}>
                    <SelectTrigger className="bg-white border-gray-200 shadow-sm"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {employees.map((m) => {
                        const name = m.users?.full_name || m.users?.email?.split("@")[0] || m.user_id;
                        return <SelectItem key={m.user_id} value={m.user_id}>{name}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200 shadow-sm">
                <BellRing className="h-4 w-4 text-gray-500 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-700">Notify Admin</div>
                  <div className="text-xs text-gray-500">Send an internal notification when created or sent.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, notify_admin: !f.notify_admin }))}
                  className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none ${form.notify_admin ? "bg-primary" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.notify_admin ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Line Items</h3>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs rounded-lg bg-white" onClick={addLine}>
                  <Plus className="h-3 w-3 mr-1" /> Add Row
                </Button>
              </div>
              <div className="border border-gray-200 shadow-sm rounded-xl overflow-x-auto bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500">
                      <th className="px-3 py-2 font-bold">Description</th>
                      <th className="px-2 py-2 font-bold w-20">HSN/SAC</th>
                      <th className="px-2 py-2 font-bold w-16">Unit</th>
                      <th className="px-2 py-2 font-bold w-14">Qty</th>
                      <th className="px-2 py-2 font-bold w-24">Unit Price</th>
                      <th className="px-2 py-2 font-bold w-14">Disc%</th>
                      <th className="px-2 py-2 font-bold w-24 text-right">Amount</th>
                      <th className="px-2 py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.line_items.map((item, idx) => (
                      <tr key={idx} className="border-t border-gray-100">
                        <td className="px-2 py-1.5">
                          <Input value={item.description} onChange={(e) => updateLine(idx, "description", e.target.value)} placeholder="Description" className="h-7 text-xs border-transparent bg-transparent focus-visible:bg-white focus-visible:border-gray-300 px-1" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input value={item.hsn_sac} onChange={(e) => updateLine(idx, "hsn_sac", e.target.value)} placeholder="998361" className="h-7 text-xs border-transparent bg-transparent focus-visible:bg-white focus-visible:border-gray-300 px-1 w-18" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input value={item.unit} onChange={(e) => updateLine(idx, "unit", e.target.value)} className="h-7 text-xs border-transparent bg-transparent focus-visible:bg-white focus-visible:border-gray-300 px-1 w-14" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min={1} value={item.qty} onChange={(e) => updateLine(idx, "qty", e.target.value)} className="h-7 text-xs border-transparent bg-transparent focus-visible:bg-white focus-visible:border-gray-300 px-1 w-12" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min={0} value={item.unit_price} onChange={(e) => updateLine(idx, "unit_price", e.target.value)} className="h-7 text-xs border-transparent bg-transparent focus-visible:bg-white focus-visible:border-gray-300 px-1 w-20" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min={0} max={100} value={item.discount} onChange={(e) => updateLine(idx, "discount", e.target.value)} className="h-7 text-xs border-transparent bg-transparent focus-visible:bg-white focus-visible:border-gray-300 px-1 w-12" />
                        </td>
                        <td className="px-2 py-1.5 text-right font-bold text-gray-700">{fmt(lineNet(item))}</td>
                        <td className="px-2 py-1.5">
                          <button type="button" onClick={() => removeLine(idx)} disabled={form.line_items.length === 1} className="h-6 w-6 rounded-lg grid place-items-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes & Tax */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Tax / IGST Rate (%)</Label>
                <Input type="number" min={0} max={100} value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 })} className="bg-white border-gray-200 shadow-sm w-32" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Notes</Label>
                <textarea rows={3} placeholder="Optional notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 shadow-sm rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
              </div>
            </div>

            {/* LIVE PREVIEW EMBED */}
            <div className="pt-6">
              <div className="text-center bg-gray-200/60 text-gray-500 text-[10px] font-bold py-2.5 uppercase tracking-widest rounded-t-xl border border-b-0 border-gray-300">
                Live Preview — Exact PDF Layout
              </div>
              <div className="border border-gray-300 rounded-b-xl bg-gray-100 p-2 sm:p-4 overflow-hidden flex justify-center">
                <div className="w-full max-w-[400px] h-[500px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-y-auto">
                  {/* We render QuotationPreview inside, but we must pass a prop or use CSS to scale it if needed. For now, it will just scroll. */}
                  <div className="origin-top scale-[0.8] w-[125%] h-[125%]">
                     <QuotationPreview quotation={livePreviewMock} onClose={() => {}} embedded />
                  </div>
                </div>
              </div>
            </div>

            {/* TOTALS CARD */}
            <div className="bg-[#1C2331] text-white rounded-2xl p-5 space-y-3 shadow-lg">
              <h4 className="text-[10px] font-bold text-blue-300/80 uppercase tracking-widest mb-3">Auto-Calculated Totals</h4>
              <div className="flex justify-between items-center text-sm text-slate-300">
                <span>Untaxed Amount</span>
                <span className="font-bold text-white">{fmt(subtotal(form.line_items))}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-slate-300">
                <span>IGST ({form.tax_rate}%)</span>
                <span className="font-bold text-white">{fmt((subtotal(form.line_items) * form.tax_rate) / 100)}</span>
              </div>
              <div className="pt-3 border-t border-slate-700/50 flex justify-between items-center">
                <span className="font-bold text-base">Grand Total</span>
                <span className="font-bold text-[#00E676] text-xl">{fmt(subtotal(form.line_items) * (1 + form.tax_rate/100))}</span>
              </div>
            </div>

            {/* PAYMENT */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest border-b pb-2">Payment</h3>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Payment Communication</Label>
                <Input value={form.upi_id} onChange={(e) => setForm({ ...form, upi_id: e.target.value })} placeholder="Q-00003" className="bg-white border-gray-200 shadow-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Payment Phone / QR Code Number</Label>
                <Input value={form.payment_phone} onChange={(e) => setForm({ ...form, payment_phone: e.target.value })} placeholder="9999999999" className="bg-white border-gray-200 shadow-sm" />
              </div>
            </div>

            {/* Status & Submit */}
            <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-700">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Quotation["status"] })}>
                  <SelectTrigger className="w-36 bg-white border-gray-200 shadow-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Draft", "Sent"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setOpen(false); setForm(defaultForm()); setEditingQuotation(null); }} className="bg-white">
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={createQuotation.isPending || updateQuotation.isPending} className="bg-primary text-white">
                  {createQuotation.isPending || updateQuotation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : <><Send className="h-4 w-4 mr-2" />{editingQuotation ? "Update Quotation" : "Create Quotation"}</>}
                </Button>
              </div>
            </div>

          </div>
        </SheetContent>
      </Sheet>


      {/* ── Preview ────────────────────────────────────────────────────────── */}
      {preview && <QuotationPreview quotation={preview} onClose={() => setPreview(null)} />}
    </AppShell>
  );
}

// ── Invoice Preview ────────────────────────────────────────────────────────────
function QuotationPreview({ quotation: q, onClose, embedded }: { quotation: Quotation; onClose?: () => void; embedded?: boolean }) {
  const ef = q.extra_fields ?? {};
  const sub = subtotal(q.line_items);
  const taxAmt = (sub * q.tax_rate) / 100;
  const total = sub + taxAmt;

  // HSN summary: group by hsn_sac
  const hsnSummary = useMemo(() => {
    const map: Record<string, { qty: number; taxable: number; igst: number; unit: string }> = {};
    q.line_items.forEach((item) => {
      const key = item.hsn_sac || "—";
      if (!map[key]) map[key] = { qty: 0, taxable: 0, igst: 0, unit: item.unit };
      const net = lineNet(item);
      map[key].qty += item.qty;
      map[key].taxable += net;
      map[key].igst += (net * q.tax_rate) / 100;
    });
    return Object.entries(map).map(([hsn, v]) => ({ hsn, ...v }));
  }, [q]);

  const handlePrint = () => {
    const el = document.getElementById("q-print");
    if (!el) return;
    const win = window.open("", "_blank", "width=900,height=1100");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>${q.quotation_number}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid #e5e7eb; }
        .logo { font-size: 22px; font-weight: 800; color: #1a1a2e; }
        .tagline { font-size: 10px; color: #6b7280; margin-top: 4px; }
        img { max-height: 40px; width: auto; object-fit: contain; display: block; }
        .company-addr { text-align: right; font-size: 11px; color: #374151; line-height: 1.6; }
        h1 { font-size: 20px; font-weight: 700; color: #1a1a2e; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
        .client-block { padding: 12px 0; }
        .client-name { font-size: 14px; font-weight: 700; }
        .client-sub { font-size: 11px; color: #6b7280; margin-top: 3px; }
        .details-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 0; border: 1px solid #e5e7eb; margin: 12px 0; }
        .detail-cell { padding: 8px 12px; border-right: 1px solid #e5e7eb; }
        .detail-cell:last-child { border-right: none; }
        .detail-label { font-size: 10px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
        .detail-value { font-size: 12px; font-weight: 600; margin-top: 3px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #f9fafb; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; padding: 8px 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        td { padding: 8px 10px; font-size: 12px; border-bottom: 1px solid #f3f4f6; }
        .text-right { text-align: right; }
        .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
        .summary-total { font-weight: 700; font-size: 14px; border-top: 2px solid #111; padding-top: 6px; margin-top: 4px; }
        .words-block { background: #f9fafb; border: 1px solid #e5e7eb; padding: 8px 12px; font-size: 11px; color: #374151; font-style: italic; margin-top: 8px; }
        .hsn-section { margin-top: 20px; }
        .hsn-title { font-size: 13px; font-weight: 700; margin-bottom: 6px; }
        .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 10px; color: #6b7280; }
        .payment-section { margin-top: 12px; padding: 10px; background: #f9fafb; border: 1px solid #e5e7eb; font-size: 11px; }
        .payment-title { font-weight: 700; font-size: 12px; margin-bottom: 6px; }
        .qr-placeholder { width: 80px; height: 80px; border: 2px dashed #9ca3af; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #9ca3af; text-align: center; margin: 8px 0; }
        .bottom-grid { display: flex; gap: 16px; margin-top: 12px; }
        .bottom-left { flex: 1; }
        .bottom-right { width: 220px; }
      </style>
    </head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  const content = (
    <div className={`bg-white flex flex-col ${embedded ? 'w-full h-full' : 'rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh]'}`} onClick={embedded ? undefined : (e) => e.stopPropagation()}>
      {/* Modal toolbar */}
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

      {/* Scrollable invoice body */}
      <div className={embedded ? "flex-1" : "overflow-y-auto flex-1"}>
          <div id="q-print" className="p-6 text-sm text-gray-800">

            {/* ── Header: Logo + Company Address ── */}
            <div className="flex items-start justify-between pb-4 border-b-2 border-gray-200">
              <div>
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 inline-block mb-2 shadow-sm">
                  <img src={logo} alt="Logo" style={{ height: "40px", width: "auto", objectFit: "contain", display: "block" }} />
                </div>
                {ef.company_tagline && (
                  <p className="text-[11px] text-gray-500 mt-1 italic">{ef.company_tagline}</p>
                )}
              </div>
              <div className="text-right text-[11px] text-gray-600 leading-relaxed">
                {ef.company_address && <p>{ef.company_address}</p>}
                {ef.company_gstin && <p>GSTIN: {ef.company_gstin}</p>}
              </div>
            </div>

            {/* ── Quotation Title ── */}
            <h1 className="text-xl font-bold text-gray-900 py-3 border-b border-gray-200">
              Quotation {q.quotation_number}
            </h1>

            {/* ── Client Block ── */}
            <div className="py-3">
              <p className="font-bold text-sm">{q.client_name}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">GSTIN: {ef.client_gstin || ""}</p>
              <p className="text-[11px] text-gray-500">Place of supply: {ef.place_of_supply || ""}</p>
            </div>

            {/* ── Issue Date / Valid Until / Source / Reference ── */}
            <div className="grid grid-cols-4 border border-gray-200 rounded-none overflow-hidden text-xs mb-3">
              {[
                { label: "Issue Date", value: fmtDate(q.issue_date) },
                { label: "Valid Until", value: fmtDate(q.valid_until) },
                { label: "Source", value: ef.source || "—" },
                { label: "Reference", value: ef.reference_no || "—" },
              ].map((cell, i) => (
                <div key={i} className={`px-3 py-2 ${i < 3 ? "border-r border-gray-200" : ""}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{cell.label}</p>
                  <p className="font-semibold text-gray-800">{cell.value}</p>
                </div>
              ))}
            </div>

            {/* ── Line Items Table ── */}
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

            {/* ── Bottom: Payment (left) + Tax Summary (right) ── */}
            <div className="flex gap-4 mt-3">
              {/* Payment */}
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

              {/* Tax Summary */}
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

            {/* ── Amount in Words ── */}
            <div className="mt-3 bg-gray-50 border border-gray-200 rounded-none px-3 py-2 text-[11px] text-gray-600 italic">
              Total amount in words: <span className="font-semibold not-italic text-gray-800">{amountToWords(total)}</span>
            </div>

            {/* ── HSN Summary ── */}
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

            {/* ── Footer ── */}
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
