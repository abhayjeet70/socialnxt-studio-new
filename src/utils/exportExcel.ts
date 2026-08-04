import ExcelJS from "exceljs";
import pkg from "file-saver";
const saveAs = (pkg as any).saveAs ?? (pkg as any).default?.saveAs ?? pkg;

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExportPost = {
  id: string;
  scheduled_for: string | null;
  client_name: string | null;
  platform: string | null;
  platforms: string[] | null;
  content_type: string | null;
  topic: string | null;
  reference_content: string[] | null;
  completed_work: string[] | null;
  content: string | null; // caption
  status: string;
  assigned_to?: string[] | null;
  created_at: string;
  approved_by?: string | null;
};

export type ExportMember = {
  user_id: string;
  users?: { full_name?: string | null; email?: string | null };
};

export type ExportOptions = {
  posts: ExportPost[];
  members: ExportMember[];
  clientName?: string;
  customColumns?: string[];
};

// ─── Constants ───────────────────────────────────────────────────────────────

const PURPLE = "FF7C3AED";
const WHITE  = "FFFFFFFF";
const GRAY_BG = "FFF9FAFB";

const STATUS_COLORS: Record<string, { fill: string; font: string }> = {
  published:         { fill: "FFD1FAE5", font: "FF065F46" },
  approved:          { fill: "FFD1FAE5", font: "FF065F46" },
  scheduled:         { fill: "FFDBEAFE", font: "FF1E40AF" },
  pending_approval:  { fill: "FFFEF3C7", font: "FF92400E" },
  changes_requested: { fill: "FFFDE68A", font: "FF92400E" },
  draft:             { fill: "FFF3F4F6", font: "FF6B7280" },
  failed:            { fill: "FFFEE2E2", font: "FF991B1B" },
};

// ─── Image helpers ────────────────────────────────────────────────────────────

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64 ?? null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function guessExtension(url: string): "png" | "jpeg" | "gif" | "bmp" {
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".gif")) return "gif";
  if (lower.endsWith(".bmp")) return "bmp";
  return "jpeg";
}

function isImageUrl(url: string): boolean {
  const lower = url.toLowerCase().split("?")[0];
  return (
    /\.(png|jpe?g|gif|bmp|webp)$/.test(lower) ||
    lower.includes("supabase") ||
    lower.includes("cloudinary") ||
    lower.includes("storage.googleapis") ||
    lower.includes("s3.amazonaws") ||
    lower.startsWith("blob:")
  );
}

// ─── Border helper ────────────────────────────────────────────────────────────

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top:    { style: "thin", color: { argb: "FFD1D5DB" } },
  left:   { style: "thin", color: { argb: "FFD1D5DB" } },
  bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
  right:  { style: "thin", color: { argb: "FFD1D5DB" } },
};

// ─── Main export function ─────────────────────────────────────────────────────

export async function exportContentSheetToExcel(opts: ExportOptions): Promise<void> {
  const { posts, members, clientName, customColumns = [] } = opts;

  if (posts.length === 0) throw new Error("No data to export.");

  const workbook = new ExcelJS.Workbook();
  workbook.creator   = "SocialNxt Studio";
  workbook.company   = "SocialNxt";
  workbook.title     = "Content Sheet";
  workbook.created   = new Date();
  workbook.modified  = new Date();

  const sheet = workbook.addWorksheet("Content Sheet", {
    pageSetup: {
      paperSize:   9,          // A4
      orientation: "landscape",
      fitToPage:   true,
      fitToWidth:  1,
    },
    views: [{ state: "frozen", xSplit: 0, ySplit: 1, showGridLines: true }],
  });

  // ─── Column definitions ──────────────────────────────────────────────────

  const baseColumns: ExcelJS.Column[] = [
    { header: "Date",              key: "date",       width: 14 },
    { header: "Week Day",          key: "weekday",    width: 13 },
    { header: "Client",            key: "client",     width: 24 },
    { header: "Platform",          key: "platform",   width: 18 },
    { header: "Content Type",      key: "ctype",      width: 18 },
    { header: "Topic",             key: "topic",      width: 40 },
    { header: "Reference Content", key: "reference",  width: 30 },
    { header: "Completed Content", key: "completed",  width: 30 },
    { header: "Caption",           key: "caption",    width: 50 },
    { header: "Assigned To",       key: "assigned",   width: 34 },
    { header: "Scheduled Time",    key: "scheduled",  width: 22 },
    { header: "Status",            key: "status",     width: 22 },
    ...customColumns.map(
      (col) => ({ header: col, key: `custom_${col}`, width: 20 } as ExcelJS.Column)
    ),
  ];

  sheet.columns = baseColumns;

  // ─── Style the header row ────────────────────────────────────────────────

  const headerRow = sheet.getRow(1);
  headerRow.height = 38;

  baseColumns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font  = { bold: true, color: { argb: WHITE }, size: 12, name: "Calibri" };
    cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: PURPLE } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top:    { style: "medium", color: { argb: "FF5B21B6" } },
      left:   { style: "thin",   color: { argb: "FF6D28D9" } },
      bottom: { style: "medium", color: { argb: "FF5B21B6" } },
      right:  { style: "thin",   color: { argb: "FF6D28D9" } },
    };
  });

  // ─── Auto-filter ─────────────────────────────────────────────────────────

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: baseColumns.length },
  };

  // ─── Data rows ────────────────────────────────────────────────────────────

  const IMAGE_ROW_HEIGHT = 95;

  for (let i = 0; i < posts.length; i++) {
    const p       = posts[i];
    const rowNum  = i + 2; // 1-indexed; row 1 = header
    const isEven  = i % 2 === 0;
    const bgArgb  = isEven ? WHITE : GRAY_BG;

    // Date / time strings
    const scheduledDate = p.scheduled_for ? new Date(p.scheduled_for) : null;
    const dateStr = scheduledDate
      ? scheduledDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      : "";
    const weekDay = scheduledDate
      ? scheduledDate.toLocaleDateString("en-US", { weekday: "long" })
      : "";
    const timeStr = scheduledDate
      ? scheduledDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
      : "";
    const scheduledFull = scheduledDate ? `${dateStr}\n${timeStr}` : "";

    const platform = p.platform || (p.platforms?.join(", ") ?? "");
    const assignedNames = members
      .filter((m) => Array.isArray(p.assigned_to) && p.assigned_to.includes(m.user_id))
      .map((m) => m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown")
      .join("\n");

    // Separate images from text links
    const refImages   = (p.reference_content  ?? []).filter(isImageUrl);
    const compImages  = (p.completed_work      ?? []).filter(isImageUrl);
    const refLinks    = (p.reference_content   ?? []).filter((u) => !isImageUrl(u));
    const compLinks   = (p.completed_work      ?? []).filter((u) => !isImageUrl(u));

    const hasImages = refImages.length > 0 || compImages.length > 0;

    const rowData: Record<string, string> = {
      date:      dateStr,
      weekday:   weekDay,
      client:    p.client_name ?? "",
      platform,
      ctype:     p.content_type ?? "",
      topic:     p.topic ?? "",
      reference: refImages.length > 0  ? "" : (refLinks.join(", ")  || "No media added"),
      completed: compImages.length > 0 ? "" : (compLinks.join(", ") || "No media added"),
      caption:   p.content ?? "",
      assigned:  assignedNames,
      scheduled: scheduledFull,
      status:    p.status.replace(/_/g, " "),
      ...Object.fromEntries(customColumns.map((col) => [`custom_${col}`, ""])),
    };

    const row = sheet.addRow(rowData);
    row.height = hasImages ? IMAGE_ROW_HEIGHT : 54;

    // Style every cell
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font      = { name: "Calibri", size: 11, color: { argb: "FF1F2937" } };
      cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      cell.border    = THIN_BORDER;
      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };
    });

    // Status colour override
    const statusColIdx = baseColumns.findIndex((c) => c.key === "status") + 1;
    const statusCell   = row.getCell(statusColIdx);
    const sc = STATUS_COLORS[p.status] ?? STATUS_COLORS.draft;
    statusCell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: sc.fill } };
    statusCell.font      = { bold: true, name: "Calibri", size: 11, color: { argb: sc.font } };
    statusCell.alignment = { vertical: "middle", horizontal: "center" };

    // Reference image
    const refColIdx = baseColumns.findIndex((c) => c.key === "reference") + 1;
    for (const imgUrl of refImages.slice(0, 1)) {
      try {
        const base64 = await fetchImageAsBase64(imgUrl);
        if (!base64) continue;
        const imageId = workbook.addImage({ base64, extension: guessExtension(imgUrl) });
        const colWidthPx = (sheet.getColumn(refColIdx).width ?? 30) * 7;
        const size = Math.min(colWidthPx - 6, 82);
        sheet.addImage(imageId, {
          tl:     { col: refColIdx - 1 + 0.06, row: rowNum - 1 + 0.06 },
          ext:    { width: size, height: size },
          editAs: "oneCell",
        });
      } catch { /* skip */ }
    }

    // Completed image
    const compColIdx = baseColumns.findIndex((c) => c.key === "completed") + 1;
    for (const imgUrl of compImages.slice(0, 1)) {
      try {
        const base64 = await fetchImageAsBase64(imgUrl);
        if (!base64) continue;
        const imageId = workbook.addImage({ base64, extension: guessExtension(imgUrl) });
        const colWidthPx = (sheet.getColumn(compColIdx).width ?? 30) * 7;
        const size = Math.min(colWidthPx - 6, 82);
        sheet.addImage(imageId, {
          tl:     { col: compColIdx - 1 + 0.06, row: rowNum - 1 + 0.06 },
          ext:    { width: size, height: size },
          editAs: "oneCell",
        });
      } catch { /* skip */ }
    }
  }

  // ─── Write & download ─────────────────────────────────────────────────────

  const buffer = await workbook.xlsx.writeBuffer();
  const blob   = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const safeClient = (clientName ?? "ContentSheet").replace(/[^a-zA-Z0-9_-]/g, "_");
  const today      = new Date().toISOString().split("T")[0];
  saveAs(blob, `${safeClient}_ContentSheet_${today}.xlsx`);
}
