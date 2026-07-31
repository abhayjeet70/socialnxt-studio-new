import ExcelJS from "exceljs";
import { Post } from "@/lib/queries";

export type ExtractedImage = {
  buffer: ArrayBuffer;
  extension: string;
  rowNumber: number;
  columnName: "reference_content" | "completed_work";
};

export type ImportPreviewData = {
  fileName: string;
  totalRows: number;
  validRows: Partial<Post>[];
  invalidRows: { row: number; errors: string[] }[];
  rowWarnings: { row: number; warnings: string[] }[];
  extractedImages: ExtractedImage[];
  missingColumns: string[];
};

const REQUIRED_COLUMNS = ["Client", "Platform", "Content Type", "Topic", "Status"];

export function parseExportedScheduledTime(cellValue: string): string | null {
  if (!cellValue || !cellValue.trim()) return null;
  
  const parts = cellValue.split('\n');
  const datePart = parts[0]?.trim();
  const timePart = parts[1]?.trim();

  if (!datePart) return null;

  const dateTokens = datePart.split(' ');
  if (dateTokens.length !== 3) {
    const fallback = new Date(datePart);
    return isNaN(fallback.getTime()) ? null : fallback.toISOString();
  }

  const day = parseInt(dateTokens[0], 10);
  const monthStr = dateTokens[1].toLowerCase();
  const year = parseInt(dateTokens[2], 10);
  
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  const month = monthMap[monthStr] ?? 0;

  let hours = 0;
  let minutes = 0;

  if (timePart) {
    const timeMatch = timePart.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3].toLowerCase();
      
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      
      hours = h;
      minutes = m;
    }
  }

  const parsedDate = new Date(year, month, day, hours, minutes);
  return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
}

export async function parseExcelForPreview(file: File, workspaceId: string, authorId: string, members: any[]): Promise<ImportPreviewData> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  console.log(`[Import] File extension detected: ${ext}`);
  
  if (ext === 'xls') {
    throw new Error("Old .xls format is not supported. Please open the file in Excel and 'Save As' an .xlsx file.");
  }

  const workbook = new ExcelJS.Workbook();

  if (ext === 'csv') {
    throw new Error("CSV is no longer fully supported for imports as it lacks image embedding capabilities. Please use .xlsx exported from the application.");
  } else {
    try {
      console.log("[Import] Loading XLSX workbook into ExcelJS");
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);
      console.log("[Import] Workbook loaded successfully");
    } catch (err: any) {
      if (err.message?.includes('central directory')) {
        throw new Error("Invalid Excel file. The file may be corrupted or in an unsupported format (like a raw text file renamed to .xlsx). Please export a fresh .xlsx file.");
      }
      throw err;
    }
  }

  console.log("[Import] Detecting worksheet...");
  let sheet = workbook.getWorksheet("Content Sheet");
  if (!sheet) {
    sheet = workbook.worksheets[0]; // fallback to first sheet
    console.log("[Import] Fallback to first worksheet used");
  }

  if (!sheet) {
    throw new Error("No worksheet found in the Excel file.");
  }
  
  console.log(`[Import] Worksheet detected. Name: ${sheet.name}, RowCount: ${sheet.rowCount}`);

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = (cell.value?.toString() || cell.text || "").trim().toLowerCase(); 
  });

  console.log("[Import] Headers found:", headers);

  const REQUIRED_COLUMNS_LOWER = REQUIRED_COLUMNS.map(c => c.toLowerCase());
  const missingColumns = REQUIRED_COLUMNS_LOWER.filter(req => !headers.includes(req));
  
  if (missingColumns.length > 0) {
    console.warn("[Import] Missing required columns:", missingColumns);
  }

  const validRows: Partial<Post>[] = [];
  const invalidRows: { row: number; errors: string[] }[] = [];
  const rowWarnings: { row: number; warnings: string[] }[] = [];
  const extractedImages: ExtractedImage[] = [];

  const getColIdx = (name: string) => headers.indexOf(name.toLowerCase());

  const mediaMap = new Map<string, ExcelJS.Image>();
  if (workbook.model.media) {
    workbook.model.media.forEach((m, idx) => {
      mediaMap.set(idx.toString(), m);
    });
  }

  const sheetImages = sheet.getImages() || [];
  console.log(`[Import] Number of images found in worksheet: ${sheetImages.length}`);
  
  const anchoredImagesMap = new Map<string, ArrayBuffer>();

  for (const img of sheetImages) {
    if (!img.range || img.imageId == null) continue;
    
    const colIdx = img.range.tl.nativeCol; 
    const rowNum = img.range.tl.nativeRow + 1; 
    
    const media = mediaMap.get(img.imageId.toString());
    if (media && media.buffer) {
      anchoredImagesMap.set(`${rowNum}_${colIdx}`, media.buffer as ArrayBuffer);
    }
  }

  const refColIdx = getColIdx("Reference Content");
  const compColIdx = getColIdx("Completed Content");
  
  let processedRowCount = 0;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    processedRowCount++;
    const errors: string[] = [];
    const warnings: string[] = [];
    const getVal = (colName: string) => {
      const idx = getColIdx(colName);
      if (idx === -1) return "";
      const cell = row.getCell(idx + 1);
      if (cell.type === ExcelJS.ValueType.Date) {
        return (cell.value as Date).toISOString();
      }
      return (cell.value?.toString() || cell.text || "").trim();
    };

    const client = getVal("Client");
    const platform = getVal("Platform");
    const cType = getVal("Content Type");
    const topic = getVal("Topic");
    const caption = getVal("Caption");
    const statusRaw = getVal("Status");
    const refLinks = getVal("Reference Content");
    const compLinks = getVal("Completed Content");
    const scheduledTime = getVal("Scheduled Time");
    const assignedToStr = getVal("Assigned To");

    if (!topic && !cType && !caption) {
      errors.push("Row is completely empty (no topic, content type, or caption)");
    }

    let scheduled_for = null;
    if (scheduledTime) {
      scheduled_for = parseExportedScheduledTime(scheduledTime);
    }

    let status = "draft";
    const sl = statusRaw.toLowerCase();
    if (sl.includes("publish")) status = "published";
    else if (sl.includes("approv")) status = "approved";
    else if (sl.includes("schedul")) status = "scheduled";
    else if (sl.includes("pending")) status = "pending_approval";
    else if (sl.includes("chang")) status = "changes_requested";
    else if (sl.includes("fail")) status = "failed";

    let platformStr: string | null = null;
    let platformsArr: string[] = [];
    
    if (platform) {
      if (platform.includes(",")) {
        platformsArr = platform.split(",").map(p => p.trim()).filter(Boolean);
        platformStr = null;
      } else {
        platformStr = platform;
        platformsArr = [platform];
      }
    }

    const assigned_to: string[] = [];
    if (assignedToStr) {
      const names = assignedToStr.split('\n').map(n => n.trim()).filter(Boolean);
      for (const name of names) {
        const matches = members.filter(m => {
          const mName = (m.users?.full_name || m.full_name || m.users?.email?.split("@")[0] || m.user_email?.split("@")[0] || "").trim().toLowerCase();
          return mName === name.toLowerCase();
        });
        if (matches.length === 1) {
          assigned_to.push(matches[0].user_id);
        } else if (matches.length > 1) {
          warnings.push(`Multiple members named '${name}' found — please assign manually.`);
        } else {
          warnings.push(`Member named '${name}' not found in workspace — please assign manually.`);
        }
      }
    }

    const finalRefLinks: string[] = [];
    if (refColIdx !== -1) {
      const buffer = anchoredImagesMap.get(`${rowNumber}_${refColIdx}`);
      if (buffer) {
        extractedImages.push({ buffer, extension: "png", rowNumber, columnName: "reference_content" });
        finalRefLinks.push(`LOCAL_IMG_ROW_${rowNumber}_REF`);
      } else if (refLinks && refLinks !== "No media added") {
        finalRefLinks.push(...refLinks.split(',').map(s => s.trim()).filter(Boolean));
      }
    }

    const finalCompLinks: string[] = [];
    if (compColIdx !== -1) {
      const buffer = anchoredImagesMap.get(`${rowNumber}_${compColIdx}`);
      if (buffer) {
        extractedImages.push({ buffer, extension: "png", rowNumber, columnName: "completed_work" });
        finalCompLinks.push(`LOCAL_IMG_ROW_${rowNumber}_COMP`);
      } else if (compLinks && compLinks !== "No media added") {
        finalCompLinks.push(...compLinks.split(',').map(s => s.trim()).filter(Boolean));
      }
    }

    if (errors.length > 0) {
      invalidRows.push({ row: rowNumber, errors });
    } else {
      if (warnings.length > 0) {
        rowWarnings.push({ row: rowNumber, warnings });
      }
      validRows.push({
        _rowNumber: rowNumber,
        workspace_id: workspaceId,
        author_id: authorId,
        client_name: client,
        platform: platformStr,
        platforms: platformsArr,
        content_type: cType,
        topic,
        content: caption,
        status: status as any,
        scheduled_for: scheduled_for || undefined,
        reference_content: finalRefLinks,
        completed_work: finalCompLinks,
        assigned_to: assigned_to.length > 0 ? assigned_to : undefined,
        _warnings: warnings.length > 0 ? warnings : undefined,
      });
    }
  });

  console.log(`[Import] Number of rows parsed: ${processedRowCount}`);
  console.log(`[Import] Valid rows: ${validRows.length}`);
  console.log(`[Import] Invalid rows (skipped): ${invalidRows.length}`);
  console.log(`[Import] Rows with warnings: ${rowWarnings.length}`);
  
  if (invalidRows.length > 0) {
    invalidRows.forEach((row, i) => {
      console.log(`[Import] Row ${row.row} INVALID. Reasons: ${JSON.stringify(row.errors ?? 'NO REASON ATTACHED')}`);
    });
  }
  
  if (rowWarnings.length > 0) {
    rowWarnings.forEach((row, i) => {
      console.log(`[Import] Row ${row.row} WARNINGS: ${JSON.stringify(row.warnings ?? 'NO REASON ATTACHED')}`);
    });
  }
  
  console.log("[Import] Parsed row objects (first 2):", validRows.slice(0, 2));

  return {
    fileName: file.name,
    totalRows: Math.max(0, sheet.rowCount - 1),
    validRows,
    invalidRows,
    rowWarnings,
    extractedImages,
    missingColumns
  };
}
