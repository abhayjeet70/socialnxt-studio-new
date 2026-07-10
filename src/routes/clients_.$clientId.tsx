import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useCurrentWorkspace, useClients, usePosts, useIssues,
  useClientSocials, useAddClientSocial, useDeleteClientSocial, useUpdatePostStatus, useDeals, useWorkspaceMembers, useUpdateClient,
  useCreateDeal, useUpdateDeal, useDeleteDeal,
  useQuotations, useCreateQuotation, useUpdateQuotation, useDeleteQuotation, type Quotation
} from "@/lib/queries";
import { InvoicePreview } from "@/components/invoice-preview";
import { PLATFORM_COLOR, PLATFORMS } from "@/lib/demo-data";
import {
  ArrowLeft, Loader2, ExternalLink, LogIn, Trash2, Plus, Mail, Building2,
  CheckCircle2, ListTodo, FileText, Receipt, KanbanSquare, AlertOctagon, Copy, IndianRupee,
  Instagram, Facebook, Linkedin, Youtube, Users, Pencil, X
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/clients_/$clientId")({
  head: () => ({ meta: [{ title: "Client — SocialNxt CRM" }] }),
  component: ClientDetailPage,
});

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

function ClientDetailPage() {
  const { clientId } = useParams({ from: "/clients_/$clientId" });
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

  const addSocial = useAddClientSocial();
  const delSocial = useDeleteClientSocial();
  const updateStatus = useUpdatePostStatus();

  const [addOpen, setAddOpen] = useState(false);
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

  const [dealOpen, setDealOpen] = useState(false);
  const [dealTarget, setDealTarget] = useState<any>(null);
  const [dealAmount, setDealAmount] = useState(0);
  const [dealAdvance, setDealAdvance] = useState(0);
  const [dealProject, setDealProject] = useState("");

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
  const totalRevenue = clientDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
  const advancePaid = clientDeals.reduce((sum, d) => sum + (d.advance_paid || 0), 0);
  const pendingPayment = totalRevenue - advancePaid;

  const clientInvoices = allQuotations.filter(q => q.client_name?.toLowerCase() === name.toLowerCase() && q.quotation_number.startsWith("INV-"));

  const handleGenerateInvoice = () => {
    const items = clientTasks.filter(t => t.status === "published").map(t => ({
      description: `${t.topic || t.content_type || 'Task'} - ${(t.platforms || []).join(', ')}`,
      qty: 1,
      unit: "Unit",
      unit_price: 0,
      hsn_sac: "9983",
    }));

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

  const handleLogin = async (s: (typeof socials)[number]) => {
    const url = s.login_url || s.profile_url || PLATFORM_LOGIN_URL[s.platform] || "";
    const bits = [s.username, s.secret].filter(Boolean).join("  /  ");
    if (bits) {
      try { await navigator.clipboard.writeText(bits); toast.success("Login copied — paste on the platform"); } catch { /* ignore */ }
    }
    if (url) window.open(url, "_blank", "noopener");
    else toast.info("No URL saved for this handle");
  };

  const addHandle = () => {
    if (!ws) return;
    addSocial.mutate(
      { workspace_id: ws, client_id: client.id, platform: sPlatform, handle: sHandle || null, profile_url: sUrl || null, login_url: PLATFORM_LOGIN_URL[sPlatform] || null, username: sUser || null, secret: sSecret || null },
      {
        onSuccess: () => {
          toast.success("Handle added");
          setAddOpen(false); setSHandle(""); setSUrl(""); setSUser(""); setSSecret("");
        },
        onError: (e: any) => toast.error(e.message),
      },
    );
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
      setDealProject(deal.project_name || "Retainer");
      setDealAmount(deal.amount || 0);
      setDealAdvance(deal.advance_paid || 0);
    } else {
      setDealTarget(null);
      setDealProject("Retainer");
      setDealAmount(0);
      setDealAdvance(0);
    }
    setDealOpen(true);
  };

  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ws) return;

    if (dealTarget) {
      updateDeal.mutate({
        id: dealTarget.id,
        updates: { project_name: dealProject, amount: dealAmount, advance_paid: dealAdvance }
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
        days: "30",
        stage: "Active",
        created_by: workspace?.userId || "",
      }, {
        onSuccess: () => { toast.success("Record added"); setDealOpen(false); },
        onError: (err: any) => toast.error(err.message),
      });
    }
  };

  return (
    <AppShell title={name} subtitle={client.industry || "Client account"}>
      <div className="mb-4">
        <Link to="/clients" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All clients
        </Link>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-5">
        {/* ── Profile column ── */}
        <div className="space-y-5">
          <div className="card-soft p-5 relative">
            {isStaff && (
              <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8 text-muted-foreground hover:text-foreground" onClick={openEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <div className="flex items-center gap-3">
              <div className="min-w-0 pr-8">
                <div className="font-bold text-xl truncate">{name}</div>
                <Badge className={`rounded-sm font-bold tracking-wider text-[10px] px-2 py-0.5 border-0 mt-1.5 ${client.status === 'Closed' ? 'bg-muted text-muted-foreground' : 'bg-emerald-50 text-emerald-600'}`}>
                  {client.status === 'Closed' ? 'INACTIVE' : 'ACTIVE'}
                </Badge>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /><span className="truncate">{client.email || "No email"}</span></div>
              <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="h-4 w-4" /><span>{client.industry || "—"}</span></div>
            </div>
            {client.platforms && client.platforms.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {client.platforms.map((p) => (
                  <span key={p} className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: PLATFORM_COLOR[p as keyof typeof PLATFORM_COLOR] || "#666" }}>{p}</span>
                ))}
              </div>
            )}
            
            {/* Team Roles */}
            <div className="mt-5 pt-4 border-t border-border">
              <div className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Allocated Team</div>
              <div className="space-y-3">
                {["Account/Social Media Manager", "Designer", "Video Editor"].map(role => {
                  const managerId = client.team_assignments?.[role];
                  const member = managerId ? members.find(m => m.user_id === managerId) : null;
                  const displayName = member ? (member.users?.full_name || member.users?.email?.split("@")[0] || "Unknown") : "Unassigned";
                  const initials = member ? displayName.substring(0,2).toUpperCase() : "-";
                  const bg = role === "Designer" ? "bg-purple-100 text-purple-700" : role === "Video Editor" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700";

                  return (
                    <div key={role} className="flex items-center gap-2.5">
                      <div className={`h-8 w-8 rounded-full grid place-items-center text-[10px] font-bold shrink-0 ${member ? bg : 'bg-muted text-muted-foreground'}`}>
                        {initials}
                      </div>
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

          {/* quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card-soft p-3">
              <ListTodo className="h-4 w-4 text-muted-foreground mb-1" />
              <div className="text-xl font-bold">{clientTasks.length}</div>
              <div className="text-xs text-muted-foreground">Tasks</div>
            </div>
            <div className="card-soft p-3">
              <IndianRupee className="h-4 w-4 text-emerald-600 mb-1" />
              <div className="text-xl font-bold">{totalRevenue.toLocaleString("en-IN")}</div>
              <div className="text-xs text-muted-foreground">Deal Revenue</div>
            </div>
            <div className="card-soft p-3">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground mb-1" />
              <div className="text-xl font-bold">{advancePaid.toLocaleString("en-IN")}</div>
              <div className="text-xs text-muted-foreground">Advance</div>
            </div>
            <div className="card-soft p-3">
              <AlertOctagon className="h-4 w-4 text-rose-500 mb-1" />
              <div className="text-xl font-bold">{pendingPayment.toLocaleString("en-IN")}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </div>
        </div>

        {/* ── Related lists ── */}
        <div className="space-y-5">
          {/* Social handles — quick login */}
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
                    <button onClick={() => { if (confirm("Remove this handle?")) delSocial.mutate({ id: s.id, client_id: client.id }); }} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-red-50 text-red-500" title="Remove"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              ))}
            </div>
            {isStaff && (
              <div className="px-4 py-3 border-t border-border">
                <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add handle</Button>
              </div>
            )}
          </Section>

          {/* Tasks with Complete button */}
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
                      <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold"><CheckCircle2 className="h-4 w-4" /> Done</span>
                    ) : (
                      isStaff && (
                        <Button size="sm" variant="outline" className="h-8 rounded-lg text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={() => completeTask(t.id)} disabled={updateStatus.isPending}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
                        </Button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-2 border-t border-border">
              <a href={`/tasks?client=${encodeURIComponent(client.name)}`} className="text-xs text-primary hover:underline">Open content sheet →</a>
            </div>
          </Section>

          {/* Revenue Records */}
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
                    <div className="text-sm font-bold text-emerald-600">₹{(d.amount || 0).toLocaleString("en-IN")}</div>
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

          {/* Invoices */}
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
                    <div className="text-sm font-bold text-emerald-600">₹{(inv.line_items.reduce((s: number, i: any) => s + (i.qty * i.unit_price), 0) * (1 + inv.tax_rate/100)).toLocaleString("en-IN", {maximumFractionDigits: 0})}</div>
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

          {/* Issues */}
          <Section icon={AlertOctagon} title="Client Issues" count={clientIssues.length}>
            <div className="divide-y divide-border">
              {clientIssues.length === 0 && <div className="px-4 py-6 text-sm text-muted-foreground text-center">No issues linked to this client.</div>}
              {clientIssues.map((i: any) => (
                <div key={i.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{i.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{i.issue_type} · {i.priority}</div>
                  </div>
                  <Badge className="rounded-full border-0 bg-muted text-foreground/70">{i.status}</Badge>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-border">
              <a href={`/issues?client=${encodeURIComponent(client.name)}`} className="text-xs text-primary hover:underline">Open issues →</a>
            </div>
          </Section>
        </div>
      </div>

      {/* Add handle dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Add social handle</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <Select value={sPlatform} onValueChange={setSPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Handle</Label><Input value={sHandle} onChange={(e) => setSHandle(e.target.value)} placeholder="@brandx" /></div>
            <div className="space-y-1.5"><Label>Profile URL</Label><Input value={sUrl} onChange={(e) => setSUrl(e.target.value)} placeholder="https://instagram.com/brandx" /></div>
            <div className="space-y-1.5"><Label>Login username / email</Label><Input value={sUser} onChange={(e) => setSUser(e.target.value)} placeholder="brandx@email.com" /></div>
            <div className="space-y-1.5">
              <Label>Password / note <span className="text-muted-foreground font-normal">(optional, internal)</span></Label>
              <Input value={sSecret} onChange={(e) => setSSecret(e.target.value)} placeholder="stored for quick paste" />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addHandle} disabled={addSocial.isPending}>
              {addSocial.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              Save handle
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
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} required />
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
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{dealTarget ? "Edit Revenue Record" : "Log Revenue"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveDeal} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Description / Title</Label>
              <Input value={dealProject} onChange={e => setDealProject(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Revenue (₹)</Label>
                <Input type="number" value={dealAmount} onChange={e => setDealAmount(Number(e.target.value) || 0)} required />
              </div>
              <div className="space-y-2">
                <Label>Advance Paid (₹)</Label>
                <Input type="number" value={dealAdvance} onChange={e => setDealAdvance(Number(e.target.value) || 0)} />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setDealOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={createDeal.isPending || updateDeal.isPending}>
                {createDeal.isPending || updateDeal.isPending ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                Save Record
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Preview Invoice */}
      {previewInvoice && <InvoicePreview invoice={previewInvoice} onClose={() => setPreviewInvoice(null)} />}

      {/* Invoice Editor Modal */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="max-w-[95vw] w-[1400px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-gray-50/50">
          <div className="flex items-center justify-between px-6 py-4 border-b bg-white shrink-0">
            <div>
              <DialogTitle className="text-xl font-bold">{editingInvoice ? "Edit Invoice" : "Generate Invoice"}</DialogTitle>
              <div className="text-sm text-gray-500 mt-1">Adjust line items, pricing, and tax before finalizing.</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setInvoiceOpen(false)}>Cancel</Button>
              <Button onClick={() => {
                if (!ws) return;
                const payload = {
                  ...invoiceForm,
                  workspace_id: ws,
                  client_name: client.name,
                  quotation_number: editingInvoice?.quotation_number || `INV-${Math.floor(Math.random() * 100000)}`,
                };
                if (editingInvoice) {
                  updateQuotation.mutate({ id: editingInvoice.id, ...payload }, { onSuccess: () => { setInvoiceOpen(false); toast.success("Invoice updated!"); } });
                } else {
                  createQuotation.mutate(payload, { onSuccess: () => { setInvoiceOpen(false); toast.success("Invoice generated!"); } });
                }
              }} disabled={createQuotation.isPending || updateQuotation.isPending} className="bg-primary text-white">
                {createQuotation.isPending || updateQuotation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                {editingInvoice ? "Update Invoice" : "Save Invoice"}
              </Button>
            </div>
          </div>
          
          <div className="flex flex-1 overflow-hidden">
            {/* Editor Pane */}
            <div className="w-[450px] bg-white border-r border-gray-200 overflow-y-auto p-6 flex flex-col gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm border-b pb-2">Invoice Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Issue Date</Label>
                    <Input type="date" value={invoiceForm.issue_date?.split("T")[0] || ""} onChange={(e) => setInvoiceForm({ ...invoiceForm, issue_date: new Date(e.target.value).toISOString() })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Due Date</Label>
                    <Input type="date" value={invoiceForm.valid_until?.split("T")[0] || ""} onChange={(e) => setInvoiceForm({ ...invoiceForm, valid_until: new Date(e.target.value).toISOString() })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select value={invoiceForm.status} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Sent">Sent</SelectItem>
                        <SelectItem value="Approved">Paid</SelectItem>
                        <SelectItem value="Rejected">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tax Rate (%)</Label>
                    <Input type="number" value={invoiceForm.tax_rate} onChange={(e) => setInvoiceForm({ ...invoiceForm, tax_rate: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-semibold text-sm">Line Items</h3>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setInvoiceForm({ ...invoiceForm, line_items: [...invoiceForm.line_items, { description: "", qty: 1, unit: "Unit", unit_price: 0, hsn_sac: "9983" }] })}><Plus className="h-3 w-3 mr-1" /> Add</Button>
                </div>
                {invoiceForm.line_items.map((item: any, idx: number) => (
                  <div key={idx} className="p-3 bg-gray-50 border rounded-lg space-y-3 relative group">
                    <button className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { const nl = [...invoiceForm.line_items]; nl.splice(idx, 1); setInvoiceForm({ ...invoiceForm, line_items: nl }); }}><X className="h-3 w-3" /></button>
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">Description</Label>
                      <Input value={item.description} onChange={(e) => { const nl = [...invoiceForm.line_items]; nl[idx].description = e.target.value; setInvoiceForm({ ...invoiceForm, line_items: nl }); }} className="h-8 text-sm bg-white" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Qty</Label>
                        <Input type="number" value={item.qty} onChange={(e) => { const nl = [...invoiceForm.line_items]; nl[idx].qty = parseFloat(e.target.value) || 0; setInvoiceForm({ ...invoiceForm, line_items: nl }); }} className="h-8 text-sm bg-white" />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Unit</Label>
                        <Input value={item.unit} onChange={(e) => { const nl = [...invoiceForm.line_items]; nl[idx].unit = e.target.value; setInvoiceForm({ ...invoiceForm, line_items: nl }); }} className="h-8 text-sm bg-white" />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Price</Label>
                        <Input type="number" value={item.unit_price} onChange={(e) => { const nl = [...invoiceForm.line_items]; nl[idx].unit_price = parseFloat(e.target.value) || 0; setInvoiceForm({ ...invoiceForm, line_items: nl }); }} className="h-8 text-sm bg-white" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Preview Pane */}
            <div className="flex-1 bg-gray-100 p-8 overflow-y-auto">
              <div className="mx-auto shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl bg-white max-w-4xl min-h-[1000px] overflow-hidden">
                <InvoicePreview invoice={{ ...invoiceForm, id: editingInvoice?.id || "mock", quotation_number: editingInvoice?.quotation_number || "INV-NEW", client_name: client.name, created_at: new Date().toISOString() } as Quotation} embedded />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
