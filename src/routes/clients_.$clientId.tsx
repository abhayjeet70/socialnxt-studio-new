import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useCurrentWorkspace, useClients, usePosts, useIssues,
  useClientSocials, useAddClientSocial, useDeleteClientSocial, useUpdateClientSocial, useUpdatePostStatus, useDeals, useWorkspaceMembers, useUpdateClient,
  useCreateDeal, useUpdateDeal, useDeleteDeal,
  useQuotations, useCreateQuotation, useUpdateQuotation, useDeleteQuotation, type Quotation
} from "@/lib/queries";

import { InvoiceAdapter } from "@/components/invoices/InvoiceAdapter";
import { PLATFORM_COLOR, PLATFORMS } from "@/lib/demo-data";
import {
  ArrowLeft, Loader2, ExternalLink, LogIn, Trash2, Plus, Mail, Building2,
  CheckCircle2, ListTodo, FileText, Receipt, KanbanSquare, AlertOctagon, Copy, IndianRupee,
  Instagram, Facebook, Linkedin, Youtube, Users, Pencil, X, Phone, Calendar
} from "lucide-react";
import { toast } from "sonner";

const PLATFORM_LOGIN_URL: Record<string, string> = {
  Instagram: "https://www.instagram.com/accounts/login/",
  Facebook: "https://www.facebook.com/login/",
  LinkedIn: "https://www.linkedin.com/login",
  YouTube: "https://accounts.google.com/",
  Twitter: "https://twitter.com/login",
  TikTok: "https://www.tiktok.com/login",
};

const CLIENT_AVATAR_COLORS = [
  "#2563EB", "#10B981", "#F59E0B", "#EC4899",
  "#8B5CF6", "#06B6D4", "#EF4444", "#0EA5E9",
];

const INDUSTRY_OPTIONS = ["Real Estate", "Food", "Fashion", "Perfume", "Beauty Products", "Other"];

function getClientAvatarColor(name: string): string {
  const idx = name.charCodeAt(0) % CLIENT_AVATAR_COLORS.length;
  return CLIENT_AVATAR_COLORS[idx];
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getPlatformIcon(platform: string) {
  switch (platform) {
    case "Instagram": return <Instagram className="w-5 h-5" />;
    case "Facebook": return <Facebook className="w-5 h-5" />;
    case "LinkedIn": return <Linkedin className="w-5 h-5" />;
    case "YouTube": return <Youtube className="w-5 h-5" />;
    case "TikTok": return <svg className="w-4 h-4 fill-current" viewBox="0 0 448 512"><path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"/></svg>;
    default: return <Users className="w-5 h-5" />;
  }
}

function Section({ icon: Icon, title, count, children }: { icon: any; title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="card-soft overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-sm">{title}</span>
        {count !== undefined && <span className="text-xs text-muted-foreground">({count})</span>}
      </div>
      {children}
    </div>
  );
}

export function ClientDetailPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { data: workspace } = useCurrentWorkspace();
  const ws = workspace?.workspaceId;
  const isStaff = workspace?.role === "admin" || workspace?.role === "employee";

  const { data: clients = [], isLoading } = useClients(ws);
  const client = clients.find((c) => c.id === clientId);

  const { data: socials = [] } = useClientSocials(clientId);
  const { data: posts = [] } = usePosts(ws);
  const { data: issues = [] } = useIssues(ws);
  const { data: deals = [] } = useDeals(ws);
  const { data: members = [] } = useWorkspaceMembers(ws);
  const { data: allQuotations = [] } = useQuotations(ws);
  const staffMembers = members.filter((m) => m.role === "employee");

  const allWorkspacePlatforms = useMemo(() => {
    const defaultPlats = ["Instagram", "Facebook", "LinkedIn", "YouTube", "TikTok", "Twitter"];
    const customPlats = workspace?.customPlatforms?.map(p => p.name) || [];
    return Array.from(new Set([...defaultPlats, ...customPlats]));
  }, [workspace?.customPlatforms]);

  const addSocial = useAddClientSocial();
  const updateSocial = useUpdateClientSocial();
  const delSocial = useDeleteClientSocial();
  const updateStatus = useUpdatePostStatus();

  const [addOpen, setAddOpen] = useState(false);
  const [editingSocialId, setEditingSocialId] = useState<string | null>(null);
  const [sPlatform, setSPlatform] = useState("Instagram");
  const [sHandle, setSHandle] = useState("");
  const [sUrl, setSUrl] = useState("");
  const [sUser, setSUser] = useState("");
  const [sSecret, setSSecret] = useState("");

  const updateClient = useUpdateClient();
  const createDeal = useCreateDeal();
  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();

  const createQuotation = useCreateQuotation();
  const updateQuotation = useUpdateQuotation();
  const deleteQuotation = useDeleteQuotation();

  const [editClient, setEditClient] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editIndustry, setEditIndustry] = useState("");
  const [editPlatforms, setEditPlatforms] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState("Planning");
  const [editTeam, setEditTeam] = useState<Record<string, string>>({});
  const [editBillingDate, setEditBillingDate] = useState<number | "">("");
  const [editDisplayId, setEditDisplayId] = useState("");

  const [dealOpen, setDealOpen] = useState(false);
  const [dealTarget, setDealTarget] = useState<any>(null);
  const [dealAmount, setDealAmount] = useState(0);
  const [dealAdvance, setDealAdvance] = useState(0);
  const [dealProject, setDealProject] = useState("");
  const [dealDate, setDealDate] = useState("");
  const [dealMethod, setDealMethod] = useState("UPI");
  const [dealNote, setDealNote] = useState("");
  const [dealGst, setDealGst] = useState<number>(18);

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Quotation | null>(null);
  const [invoiceForm, setInvoiceForm] = useState<any>({
    status: "Draft",
    issue_date: new Date().toISOString(),
    valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    line_items: [],
    tax_rate: 18,
    extra_fields: {}
  });
  const [previewInvoice, setPreviewInvoice] = useState<Quotation | null>(null);

  const [activeTab, setActiveTab] = useState("Social Handles");

  if (isLoading) {
    return (
      <AppShell title="Client">
        <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </AppShell>
    );
  }
  if (!client) {
    return (
      <AppShell title="Client not found">
        <div className="card-soft p-8 text-center text-muted-foreground">
          This client doesn't exist. <Link to="/clients" className="text-primary hover:underline">Back to clients</Link>
        </div>
      </AppShell>
    );
  }

  const name = client.name;
  const clientTasks = posts.filter((p) => (p.client_name || "").toLowerCase() === name.toLowerCase());
  const clientIssues = issues.filter((i: any) => (i.client_name || "").toLowerCase() === name.toLowerCase());

  const clientDeals = deals.filter(d => d.client_name?.toLowerCase() === name.toLowerCase());
  
  const getDealGross = (d: any) => {
    const match = d.payment_note?.match(/\[GST:(\d+)\]/);
    const gstRate = match ? Number(match[1]) : 18;
    return (d.amount || 0) * (1 + gstRate / 100);
  };

  const totalRevenue = clientDeals.reduce((sum, d) => sum + getDealGross(d), 0);
  const advancePaid = clientDeals.reduce((sum, d) => sum + (d.advance_paid || 0), 0);
  const pendingPayment = totalRevenue - advancePaid;

  const clientInvoices = allQuotations.filter(q => q.client_name?.toLowerCase() === name.toLowerCase() && q.quotation_number.startsWith("INV-"));

  const handleGenerateInvoice = () => {
    const items = clientDeals.map(d => {
      const match = d.payment_note?.match(/\[GST:(\d+)\]/);
      const gstRate = match ? Number(match[1]) : 18;
      
      return {
        description: d.project_name || 'Revenue Record',
        qty: 1,
        unit: "Unit",
        unit_price: d.amount || 0,
        hsn_sac: "9983",
        tax_rate: gstRate,
        tax_label: gstRate === 0 ? "Exempt" : `IGST ${gstRate}%`,
      };
    });

    setInvoiceForm({
      status: "Draft",
      issue_date: new Date().toISOString(),
      valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      line_items: items.length > 0 ? items : [{ description: "", qty: 1, unit: "Unit", unit_price: 0, hsn_sac: "9983" }],
      tax_rate: 18,
      extra_fields: { company_tagline: `Invoice INV-NEW`, source: "Client Management" }
    });
    setEditingInvoice(null);
    setInvoiceOpen(true);
  };

  const openEditSocial = (s: any) => {
    setEditingSocialId(s.id);
    setSPlatform(s.platform);
    setSHandle(s.handle || s.username || "");
    setSUrl(s.profile_url || "");
    setSUser(s.username || "");
    try {
      setSSecret(s.secret ? atob(s.secret) : "");
    } catch {
      setSSecret(s.secret || "");
    }
    setAddOpen(true);
  };

  const handleLogin = async (s: (typeof socials)[number]) => {
    const url = s.login_url || s.profile_url || PLATFORM_LOGIN_URL[s.platform] || "";
    let decodedSecret = s.secret;
    if (s.secret) {
        try { decodedSecret = atob(s.secret); } catch (e) { /* ignore if not valid base64 */ }
    }
    
    if (decodedSecret) {
      try { 
        await navigator.clipboard.writeText(decodedSecret); 
        toast.success(`Password copied for ${s.username || 'this handle'}! Just paste it.`); 
      } catch { /* ignore */ }
    } else if (s.username) {
      try { 
        await navigator.clipboard.writeText(s.username); 
        toast.success("Username copied (no password saved)."); 
      } catch { /* ignore */ }
    }

    if (url) window.open(url, "_blank", "noopener");
    else toast.info("No URL saved for this handle");
  };

  const addHandle = () => {
    if (!ws) return;
    
    if (!sPlatform || !sHandle || !sUser) {
      toast.error("Platform, Handle, and Login username are required");
      return;
    }
    if (/\s/.test(sHandle)) {
      toast.error("Handle cannot contain spaces");
      return;
    }
    if (sHandle.length > 50) {
      toast.error("Handle must be 50 characters or less");
      return;
    }
    if (!editingSocialId && socials.some(s => s.platform === sPlatform)) {
      toast.error(`A handle for ${sPlatform} already exists`);
      return;
    }

    let finalUrl = sUrl;
    if (!finalUrl && sHandle) {
        if (sPlatform === 'Instagram') finalUrl = `https://instagram.com/${sHandle}`;
        else if (sPlatform === 'Facebook') finalUrl = `https://facebook.com/${sHandle}`;
        else if (sPlatform === 'LinkedIn') finalUrl = `https://linkedin.com/company/${sHandle}`;
        else if (sPlatform === 'Twitter' || sPlatform === 'X') finalUrl = `https://twitter.com/${sHandle}`;
        else if (sPlatform === 'TikTok') finalUrl = `https://tiktok.com/@${sHandle}`;
        else if (sPlatform === 'YouTube') finalUrl = `https://youtube.com/@${sHandle}`;
    }

    const encodedSecret = sSecret ? btoa(sSecret) : null;
    const payload = { workspace_id: ws, client_id: client.id, platform: sPlatform, handle: sHandle, profile_url: finalUrl || null, login_url: PLATFORM_LOGIN_URL[sPlatform] || null, username: sUser, secret: encodedSecret };

    if (editingSocialId) {
      updateSocial.mutate(
        { id: editingSocialId, ...payload },
        {
          onSuccess: () => {
            toast.success("Handle updated");
            setAddOpen(false); setSHandle(""); setSUrl(""); setSUser(""); setSSecret(""); setEditingSocialId(null);
          },
          onError: (e: any) => toast.error(e.message),
        }
      );
    } else {
      addSocial.mutate(
        payload,
        {
          onSuccess: () => {
            toast.success("Handle added");
            setAddOpen(false); setSHandle(""); setSUrl(""); setSUser(""); setSSecret("");
          },
          onError: (e: any) => toast.error(e.message),
        }
      );
    }
  };

  const completeTask = (id: string) => {
    if (!ws) return;
    updateStatus.mutate({ id, status: "published", workspace_id: ws }, {
      onSuccess: () => toast.success("Task marked complete ✓"),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const openEdit = () => {
    if (!client) return;
    setEditClient(client);
    setEditName(client.name);
    setEditEmail(client.email || "");
    setEditIndustry(client.industry || "");
    setEditPlatforms(client.platforms || []);
    setEditStatus(client.status);
    setEditTeam(client.team_assignments || {});
    setEditBillingDate(client.billing_date || "");
    setEditDisplayId(client.display_id || "");
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClient || !ws) return;

    updateClient.mutate({
      id: editClient.id,
      workspace_id: ws,
      updates: {
        name: editName,
        email: editEmail || null,
        industry: editIndustry || null,
        platforms: editPlatforms,
        status: editStatus,
        team_assignments: editTeam,
        billing_date: editBillingDate || null,
        display_id: editDisplayId || null,
      },
    }, {
      onSuccess: () => {
        toast.success("Profile updated");
        setEditClient(null);
      },
      onError: (err: any) => toast.error(err.message),
    });
  };

  const openDeal = (deal?: any) => {
    if (deal) {
      setDealTarget(deal);
      setDealProject(deal.project_name || "");
      setDealAmount(deal.amount || 0);
      setDealAdvance(deal.advance_paid || 0);
      setDealDate(deal.payment_date || new Date().toISOString().split("T")[0]);
      setDealMethod(deal.payment_method || "UPI");
      
      const rawNote = deal.payment_note || "";
      const match = rawNote.match(/\[GST:(\d+)\]/);
      setDealGst(match ? Number(match[1]) : 18);
      setDealNote(rawNote.replace(/\[GST:\d+\]/, '').trim());
    } else {
      setDealTarget(null);
      setDealProject("");
      setDealAmount(0);
      setDealAdvance(0);
      setDealDate(new Date().toISOString().split("T")[0]);
      setDealMethod("UPI");
      setDealNote("");
      setDealGst(18);
    }
    setDealOpen(true);
  };

  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ws) return;

    const finalNote = (dealNote.trim() + ` [GST:${dealGst}]`).trim();

    if (dealTarget) {
      updateDeal.mutate({
        id: dealTarget.id,
        updates: { project_name: dealProject, amount: dealAmount, advance_paid: dealAdvance, payment_date: dealDate, payment_method: dealMethod, payment_note: finalNote }
      }, {
        onSuccess: () => { toast.success("Record updated"); setDealOpen(false); },
        onError: (err: any) => toast.error(err.message),
      });
    } else {
      createDeal.mutate({
        workspace_id: ws,
        client_name: name,
        project_name: dealProject,
        amount: dealAmount,
        advance_paid: dealAdvance,
        payment_date: dealDate,
        payment_method: dealMethod,
        payment_note: finalNote,
        days: "30",
        stage: "Active",
        created_by: workspace?.userId || "",
      }, {
        onSuccess: () => { toast.success("Record added"); setDealOpen(false); },
        onError: (err: any) => toast.error(err.message),
      });
    }
  };

  // helpers
  const clientCode = client.display_id || ("CL-" + client.id.replace(/-/g, "").slice(0, 8).toUpperCase());
  const isInactive = client.status === "Closed" || client.status === "Inactive";
  const manager = (() => {
    const id = client.team_assignments?.["Account/Social Media Manager"];
    const m = id ? members.find(m => m.user_id === id) : null;
    return m ? (m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown") : null;
  })();
  const managerInitials = manager ? manager.substring(0,2).toUpperCase() : null;

  return (
    <AppShell title="" subtitle="">
      {/* ── Breadcrumb + page header ── */}
      <div className="mb-6">
        <p className="text-[11px] font-bold tracking-widest text-primary uppercase mb-1">
          Delivery · Client · {clientCode}
        </p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">{name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{client.industry || client.email || "Client account"}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/clients">
              <Button variant="outline" className="rounded-xl h-9 gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            </Link>
            {isStaff && (
              <Button className="rounded-xl h-9 gap-1.5" onClick={openEdit}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── CLIENT DETAILS card ── */}
      <div 
        onClick={openEdit}
        className="rounded-2xl border border-border bg-white p-6 mb-4 shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all group"
      >
        <div className="flex justify-between items-center mb-5">
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Client Details</p>
          <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5">
          {/* Client ID */}
          <div className="flex gap-3">
            <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-0.5">Client ID</p>
              <p className="text-sm font-semibold text-foreground">{clientCode}</p>
            </div>
          </div>
          {/* Company */}
          <div className="flex gap-3">
            <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-0.5">Company</p>
              <p className="text-sm font-semibold text-foreground">{name}</p>
            </div>
          </div>
          {/* Email */}
          <div className="flex gap-3">
            <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-0.5">Email</p>
              <p className="text-sm font-semibold text-foreground">{client.email || "—"}</p>
            </div>
          </div>
          {/* Industry */}
          <div className="flex gap-3">
            <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-0.5">Industry</p>
              <p className="text-sm font-semibold text-foreground">{client.industry || "—"}</p>
            </div>
          </div>
          {/* Member since */}
          <div className="flex gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-0.5">Client Since</p>
              <p className="text-sm font-semibold text-foreground">{new Date(client.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
            </div>
          </div>
          {/* Platforms */}
          <div className="flex gap-3">
            <KanbanSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-0.5">Platforms</p>
              {client.platforms && client.platforms.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {client.platforms.map(p => (
                    <span key={p} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white" style={{ background: PLATFORM_COLOR[p as keyof typeof PLATFORM_COLOR] || "#666" }}>{p}</span>
                  ))}
                </div>
              ) : <p className="text-sm font-semibold text-foreground">—</p>}
            </div>
          </div>
        </div>
        {/* Notes row */}
        {client.industry && (
          <div className="mt-5 pt-4 border-t border-border/60 flex gap-3">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-0.5">Notes</p>
              <p className="text-sm text-foreground">—</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {/* Status */}
        <div 
          onClick={openEdit}
          className="rounded-2xl border border-border bg-white p-4 shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all group relative"
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Status</p>
            <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4" />
          </div>
          <p className={`text-sm font-bold ${isInactive ? "text-muted-foreground" : "text-primary"}`}>
            {isInactive ? "Inactive" : "Active"}
          </p>
          {manager && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 grid place-items-center text-[9px] font-bold shrink-0">{managerInitials}</div>
              <span className="text-[11px] text-muted-foreground truncate">{manager}</span>
            </div>
          )}
        </div>
        {/* Revenue */}
        {workspace?.role !== "employee" && (
          <>
            <div 
              onClick={openEdit}
              className="rounded-2xl border border-border bg-white p-4 shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all group relative"
            >
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Total Revenue</p>
                <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4" />
              </div>
              <p className="text-sm font-bold text-primary">₹{totalRevenue.toLocaleString("en-IN")}</p>
              <p className="text-[11px] text-muted-foreground mt-1">paid to date</p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-2">Advance Paid</p>
              <p className="text-sm font-bold text-foreground">₹{advancePaid.toLocaleString("en-IN")}</p>
              <p className="text-[11px] text-muted-foreground mt-1">received</p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-2">Outstanding</p>
              <p className={`text-sm font-bold ${pendingPayment > 0 ? "text-rose-500" : "text-foreground"}`}>₹{pendingPayment.toLocaleString("en-IN")}</p>
              <p className="text-[11px] text-muted-foreground mt-1">unpaid invoices</p>
            </div>
            <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-2">Billing Date</p>
              <p className="text-sm font-bold text-foreground">
                {client.billing_date ? (
                  <>
                    {client.billing_date}{["st", "nd", "rd"][((client.billing_date + 90) % 100 - 10) % 10 - 1] || "th"}
                  </>
                ) : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">of every month</p>
            </div>
          </>
        )}
        {/* Tasks */}
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-2">Tasks</p>
          <p className="text-sm font-bold text-foreground">{clientTasks.length}</p>
          <p className="text-[11px] text-muted-foreground mt-1">content items</p>
        </div>
        {/* Services */}
        <div 
          onClick={openEdit}
          className="rounded-2xl border border-border bg-white p-4 shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all group relative"
        >
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Services</p>
            <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4" />
          </div>
          {client.platforms && client.platforms.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {client.platforms.map(p => (
                <span key={p} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: PLATFORM_COLOR[p as keyof typeof PLATFORM_COLOR] || "#666" }}>{p}</span>
              ))}
            </div>
          ) : <p className="text-sm font-semibold text-muted-foreground">—</p>}
        </div>
      </div>

      {/* ── Team + Related lists ── */}
      <div className="grid lg:grid-cols-[260px_1fr] gap-5">
        {/* Team card */}
        <div className="space-y-4">
          <div 
            onClick={openEdit}
            className="rounded-2xl border border-border bg-white p-5 shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all group relative"
          >
            <div className="flex justify-between items-start mb-5">
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Allocated Team</p>
              <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity absolute top-5 right-5" />
            </div>
            <div className="space-y-3">
              {["Account/Social Media Manager", "Designer", "Video Editor"].map(role => {
                const managerId = client.team_assignments?.[role];
                const member = managerId ? members.find(m => m.user_id === managerId) : null;
                const displayName = member ? (member.users?.full_name || member.users?.email?.split("@")[0] || "Unknown") : "Unassigned";
                const initials = member ? displayName.substring(0,2).toUpperCase() : "-";
                const bg = role === "Designer" ? "bg-purple-100 text-purple-700" : role === "Video Editor" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700";
                return (
                  <div key={role} className="flex items-center gap-2.5">
                    <div className={`h-8 w-8 rounded-full grid place-items-center text-[10px] font-bold shrink-0 ${member ? bg : 'bg-muted text-muted-foreground'}`}>{initials}</div>
                    <div className="min-w-0">
                      <div className={`text-sm truncate font-medium ${!member && 'text-muted-foreground'}`}>{displayName}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{role}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Related lists ── */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "Social Handles", count: socials.length },
              { id: "Tasks", count: clientTasks.length },
              ...(workspace?.role !== "employee" ? [
                { id: "Revenue", count: clientDeals.length },
                { id: "Invoices", count: clientInvoices.length }
              ] : []),
              { id: "Issues", count: clientIssues.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                  activeTab === tab.id 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-transparent border border-border text-muted-foreground hover:bg-gray-50"
                }`}
              >
                {tab.id}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-2">
            {/* Social handles — quick login */}
            {activeTab === "Social Handles" && (
              <Section icon={LogIn} title="Social Handles — one-click login" count={socials.length}>
                <div className="divide-y divide-border">
                  {socials.length === 0 && <div className="px-4 py-6 text-sm text-muted-foreground text-center">No handles saved yet.</div>}
                  {socials.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="h-8 w-8 shrink-0 rounded-lg grid place-items-center text-white text-[11px] font-bold" style={{ background: PLATFORM_COLOR[s.platform as keyof typeof PLATFORM_COLOR] || "#666" }}>{s.platform[0]}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{s.handle || s.username || s.platform}</div>
                        <div className="text-xs text-muted-foreground truncate">{s.platform}{s.username ? ` · ${s.username}` : ""}</div>
                      </div>
                      {s.profile_url && (
                        <a href={s.profile_url} target="_blank" rel="noreferrer" className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground" title="Open profile"><ExternalLink className="h-4 w-4" /></a>
                      )}
                      <Button size="sm" className="h-8 rounded-lg" onClick={() => handleLogin(s)}>
                        <LogIn className="h-3.5 w-3.5 mr-1" /> Login
                      </Button>
                      {isStaff && (
                        <div className="flex items-center">
                          <button onClick={() => openEditSocial(s)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-muted text-muted-foreground" title="Edit"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => { if (confirm("Remove this handle?")) delSocial.mutate({ id: s.id, client_id: client.id }); }} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-red-50 text-red-500" title="Remove"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {isStaff && (
                  <div className="px-4 py-3 border-t border-border">
                    <Button variant="outline" size="sm" className="rounded-lg" onClick={() => { setEditingSocialId(null); setSPlatform("Instagram"); setSHandle(""); setSUrl(""); setSUser(""); setSSecret(""); setAddOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Add handle</Button>
                  </div>
                )}
              </Section>
            )}

            {/* Tasks with Complete button */}
            {activeTab === "Tasks" && (
              <Section icon={ListTodo} title="Tasks" count={clientTasks.length}>
                <div className="divide-y divide-border">
                  {clientTasks.length === 0 && <div className="px-4 py-6 text-sm text-muted-foreground text-center">No tasks for this client.</div>}
                  {clientTasks.map((t) => {
                    const done = t.status === "published";
                    return (
                      <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{t.topic || t.content_type || "Untitled task"}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {(t.platforms || []).join(", ") || t.platform || "—"}
                            {t.scheduled_for ? ` · ${new Date(t.scheduled_for).toLocaleDateString()}` : ""}
                          </div>
                        </div>
                        <Badge className="rounded-full border-0 bg-muted text-foreground/70 capitalize">{t.status.replace(/_/g, " ")}</Badge>
                        {done ? (
                          <span className="inline-flex items-center gap-1 text-primary text-xs font-semibold"><CheckCircle2 className="h-4 w-4" /> Done</span>
                        ) : (
                          isStaff && (
                            <Button size="sm" variant="outline" className="h-8 rounded-lg text-primary border-primary/20 hover:bg-primary/10" onClick={() => completeTask(t.id)} disabled={updateStatus.isPending}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
                            </Button>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="px-4 py-2 border-t border-border">
                  <button onClick={() => navigate(`/tasks?client=${encodeURIComponent(client.name)}`)} className="text-xs text-primary hover:underline">Open content sheet →</button>
                </div>
              </Section>
            )}

            {/* Revenue Records */}
            {activeTab === "Revenue" && workspace?.role !== "employee" && (
              <Section icon={IndianRupee} title="Revenue Records" count={clientDeals.length}>
                <div className="divide-y divide-border">
                  {clientDeals.length === 0 && <div className="px-4 py-6 text-sm text-muted-foreground text-center">No revenue logged yet.</div>}
                  {clientDeals.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{d.project_name}</div>
                        <div className="text-xs text-muted-foreground truncate">{new Date(d.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right mr-4">
                        <div className="text-sm font-bold text-primary">₹{getDealGross(d).toLocaleString("en-IN", {maximumFractionDigits: 0})}</div>
                        <div className="text-[10px] text-muted-foreground">Adv: ₹{(d.advance_paid || 0).toLocaleString("en-IN")}</div>
                      </div>
                      {isStaff && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => openDeal(d)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => { if(confirm("Delete this record?")) deleteDeal.mutate({id: d.id}); }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {isStaff && (
                  <div className="px-4 py-3 border-t border-border">
                    <Button variant="outline" size="sm" className="rounded-lg" onClick={() => openDeal()}><Plus className="h-4 w-4 mr-1" /> Log Revenue</Button>
                  </div>
                )}
              </Section>
            )}

            {/* Invoices */}
            {activeTab === "Invoices" && workspace?.role !== "employee" && (
              <Section icon={Receipt} title="Invoices" count={clientInvoices.length}>
                <div className="divide-y divide-border">
                  {clientInvoices.length === 0 && <div className="px-4 py-6 text-sm text-muted-foreground text-center">No invoices generated yet.</div>}
                  {clientInvoices.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{inv.quotation_number}</div>
                        <div className="text-xs text-muted-foreground truncate">{new Date(inv.created_at).toLocaleDateString()}</div>
                      </div>
                      <Badge className="rounded-full border-0 bg-muted text-foreground/70">{inv.status}</Badge>
                      <div className="text-right mr-2">
                        <div className="text-sm font-bold text-primary">₹{(
                          (() => {
                            const sub = inv.line_items.reduce((s: number, i: any) => {
                              const gross = (i.qty || 0) * (i.unit_price || 0);
                              return s + (gross - (gross * (i.discount || 0)) / 100);
                            }, 0);
                            return sub + (sub * (inv.tax_rate || 0)) / 100;
                          })()
                        ).toLocaleString("en-IN", {maximumFractionDigits: 0})}</div>
                      </div>
                      {isStaff && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => { setEditingInvoice(inv); setInvoiceForm(inv); setInvoiceOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-muted" onClick={() => setPreviewInvoice(inv)}><FileText className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => { if(confirm("Delete this invoice?")) deleteQuotation.mutate({ id: inv.id }); }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {isStaff && (
                  <div className="px-4 py-3 border-t border-border">
                    <Button variant="outline" size="sm" className="rounded-lg" onClick={handleGenerateInvoice}><Plus className="h-4 w-4 mr-1" /> Generate Invoice from Tasks</Button>
                  </div>
                )}
              </Section>
            )}

            {/* Issues */}
            {activeTab === "Issues" && (
              <Section icon={AlertOctagon} title="Client Issues" count={clientIssues.length}>
                <div className="divide-y divide-border">
                  {clientIssues.length === 0 && <div className="px-4 py-6 text-sm text-muted-foreground text-center">No issues linked to this client.</div>}
                  {clientIssues.map((i: any) => (
                    <div 
                      key={i.id} 
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/issues?client=${client?.id ?? ""}`)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate hover:text-primary transition-colors">{i.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{i.issue_type} · {i.priority}</div>
                      </div>
                      <Badge className="rounded-full border-0 bg-muted text-foreground/70">{i.status}</Badge>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-border">
                  <button onClick={() => navigate(`/issues?client=${client?.id ?? ""}`)} className="text-xs text-primary hover:underline">Open issues →</button>
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>

      {/* Add handle dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>{editingSocialId ? "Edit social handle" : "Add social handle"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <Select value={sPlatform} onValueChange={setSPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{allWorkspacePlatforms.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Handle</Label><Input value={sHandle} onChange={(e) => setSHandle(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Profile URL</Label><Input value={sUrl} onChange={(e) => setSUrl(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Login username / email</Label><Input value={sUser} onChange={(e) => setSUser(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Password / note <span className="text-muted-foreground font-normal">(optional, internal)</span></Label>
              <Input value={sSecret} onChange={(e) => setSSecret(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addHandle} disabled={addSocial.isPending || updateSocial.isPending}>
              {addSocial.isPending || updateSocial.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {editingSocialId ? "Update handle" : "Save handle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Client Dialog */}
      <Dialog open={!!editClient} onOpenChange={(open) => !open && setEditClient(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Profile & Team</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateClient} className="space-y-4 pt-4 max-h-[80vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client ID</Label>
                <Input value={editDisplayId} onChange={e => setEditDisplayId(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Planning">Planning</SelectItem>
                    <SelectItem value="Review">Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select
                  value={INDUSTRY_OPTIONS.includes(editIndustry) ? editIndustry : editIndustry ? "Other" : ""}
                  onValueChange={(v) => {
                    if (v === "Other") {
                      setEditIndustry("Other");
                    } else {
                      setEditIndustry(v);
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {((INDUSTRY_OPTIONS.includes(editIndustry) ? editIndustry : editIndustry ? "Other" : "") === "Other") && (
                  <Input
                    value={editIndustry === "Other" ? "" : editIndustry}
                    onChange={e => setEditIndustry(e.target.value || "Other")}
                    placeholder="Enter custom industry"
                    className="mt-2"
                  />
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Billing Date (Day of month)</Label>
                <Input type="number" min="1" max="31" value={editBillingDate} onChange={e => setEditBillingDate(Number(e.target.value) || "")} placeholder="e.g. 5 for 5th" />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Services (Platforms)</Label>
              <div className="flex flex-wrap gap-2">
                {allWorkspacePlatforms.map(p => {
                  const isSelected = editPlatforms.includes(p);
                  return (
                    <Badge
                      key={p}
                      variant="outline"
                      className={`cursor-pointer transition-colors ${isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
                      onClick={() => setEditPlatforms(isSelected ? editPlatforms.filter(x => x !== p) : [...editPlatforms, p])}
                    >
                      {p}
                    </Badge>
                  );
                })}
              </div>
            </div>
            
            <div className="space-y-2 pt-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team Allocations</Label>
              {["Account/Social Media Manager", "Designer", "Video Editor"].map(role => (
                <div key={role} className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">{role}</span>
                  <Select value={editTeam[role] || "unassigned"} onValueChange={(v) => setEditTeam({ ...editTeam, [role]: v === "unassigned" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Assign team member..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {staffMembers.filter(m => (m.agency_role || "Social Media Manager") === (role === "Account/Social Media Manager" ? "Social Media Manager" : role)).map(m => (
                        <SelectItem key={m.user_id} value={m.user_id}>{m.users?.full_name || m.users?.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditClient(null)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={updateClient.isPending}>
                {updateClient.isPending ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Deal Dialog */}
      <Dialog open={dealOpen} onOpenChange={setDealOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-y-auto max-h-[90vh] bg-[#FAF9F6]">
          <DialogHeader className="px-6 py-4 border-b bg-white">
            <DialogTitle className="text-xl font-serif text-foreground/90">{dealTarget ? "Edit Revenue Record" : "Log Revenue"}</DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-6">
            {/* Summary Block */}
            <div className="flex items-center justify-around px-4 py-5 rounded-xl border border-emerald-100 bg-white shadow-sm">
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total (Inc. Tax)</span>
                <span className="text-xl font-extrabold text-foreground">₹{(dealAmount * (1 + dealGst / 100)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-bold text-primary uppercase tracking-widest mb-1">Paid</span>
                <span className="text-xl font-extrabold text-primary">₹{dealAdvance.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[11px] font-bold text-orange-500 uppercase tracking-widest mb-1">Balance</span>
                <span className="text-xl font-extrabold text-orange-500">₹{Math.max(0, (dealAmount * (1 + dealGst / 100)) - dealAdvance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            {/* Record Form */}
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Record Details</span>
              </div>
              <form id="deal-form" onSubmit={handleSaveDeal} className="p-5 space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Description / Title</Label>
                  <Input className="h-10 border-primary/20 focus-visible:ring-primary" value={dealProject} onChange={e => setDealProject(e.target.value)} required placeholder="e.g., Retainer, Project Fee, Consultation" />
                </div>
                
                <div className="space-y-2 pb-1">
                  <Label className="text-[10px] font-bold text-primary uppercase tracking-widest">Apply GST</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Exempt", val: 0 },
                      { label: "GST 5%", val: 5 },
                      { label: "GST 12%", val: 12 },
                      { label: "GST 18%", val: 18 },
                      { label: "GST 28%", val: 28 },
                    ].map(opt => (
                      <Button
                        key={opt.label}
                        type="button"
                        variant={dealGst === opt.val ? "default" : "outline"}
                        className={`h-8 px-4 rounded-full text-xs font-semibold ${dealGst === opt.val ? "bg-primary/10 text-primary border-primary hover:bg-primary/20" : "text-primary border-primary/20 hover:border-primary"}`}
                        onClick={() => setDealGst(opt.val)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Total Amount</Label>
                    <Input type="number" className="h-10 border-primary/20 focus-visible:ring-primary" value={dealAmount || ""} onChange={e => setDealAmount(Number(e.target.value) || 0)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Advance Paid</Label>
                    <Input type="number" className="h-10 border-primary/20 focus-visible:ring-primary" value={dealAdvance || ""} onChange={e => setDealAdvance(Number(e.target.value) || 0)} />
                  </div>
                      <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Date</Label>
                    <Input type="date" className="h-10 border-primary/20 focus-visible:ring-primary" value={dealDate} onChange={e => setDealDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Method</Label>
                    <Select value={dealMethod} onValueChange={setDealMethod}>
                      <SelectTrigger className="h-10 border-primary/20 focus-visible:ring-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Note (Optional)</Label>
                  <Input className="h-10 border-primary/20 focus-visible:ring-primary" value={dealNote} onChange={e => setDealNote(e.target.value)} placeholder="Ref / remark" />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <Button type="button" variant="outline" className="h-10 px-4 rounded-lg border-border text-foreground hover:bg-muted font-medium" onClick={() => setDealAdvance(Math.round(dealAmount * (1 + dealGst / 100)))}>Full balance</Button>
                  <Button type="submit" className="h-10 px-5 rounded-lg bg-[#0F4C3A] hover:bg-[#0F4C3A]/90 text-white font-medium" disabled={createDeal.isPending || updateDeal.isPending}>
                    {createDeal.isPending || updateDeal.isPending ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                    {dealTarget ? "Update record" : "Add record"}
                  </Button>
                </div>
              </form>
            </div>

            {/* History Section */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">History</span>
              <div className="border border-dashed border-border rounded-xl p-8 text-center bg-white shadow-sm">
                <span className="text-sm text-muted-foreground">No payments recorded yet.</span>
              </div>
            </div>
            
            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" className="h-10 px-6 rounded-lg bg-white border-border hover:bg-muted" onClick={() => setDealOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Preview Invoice */}
      <Dialog open={!!previewInvoice} onOpenChange={(open) => !open && setPreviewInvoice(null)}>
        <DialogContent className="max-w-[95vw] w-[900px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-gray-50 [&>button.absolute]:hidden">
          {previewInvoice && (
            <InvoiceAdapter
              quotation={previewInvoice}
              clientName={client.name}
              readonly={true}
              onClose={() => setPreviewInvoice(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Editor Modal */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-gray-50 [&>button.absolute]:hidden">
          {invoiceOpen && (
            <InvoiceAdapter
              quotation={editingInvoice}
              clientName={client.name}
              initialLineItems={invoiceForm.line_items}
              onSave={(payload, isNew) => {
                if (!ws || !workspace?.userId) return;
                const finalPayload = {
                  ...payload,
                  workspace_id: ws,
                  created_by: workspace.userId,
                  client_name: client.name,
                  quotation_number: editingInvoice?.quotation_number || `INV-${Math.floor(Math.random() * 100000)}`,
                };
                if (!isNew && editingInvoice) {
                  updateQuotation.mutate({ id: editingInvoice.id, ...finalPayload }, { onSuccess: () => { setInvoiceOpen(false); toast.success("Invoice updated!"); } });
                } else {
                  createQuotation.mutate(finalPayload, { onSuccess: () => { setInvoiceOpen(false); toast.success("Invoice generated!"); } });
                }
              }}
              onClose={() => setInvoiceOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
