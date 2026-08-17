import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FileSpreadsheet, Image as ImageIcon, AlertTriangle, CheckCircle2, Copy } from "lucide-react";
import { ImportPreviewData } from "@/utils/importExcel";
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export type ImportMode = "append" | "merge" | "replace";

type ImportPreviewModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  previewData: ImportPreviewData | null;
  onConfirm: (mode: ImportMode) => void;
  isProcessing: boolean;
  progressMessage: string;
};

export function ImportPreviewModal({
  isOpen,
  onOpenChange,
  previewData,
  onConfirm,
  isProcessing,
  progressMessage,
}: ImportPreviewModalProps) {
  const [mode, setMode] = useState<ImportMode>("append");

  console.log("[Import] ImportPreviewModal render. isOpen:", isOpen, "previewData:", !!previewData);

  if (!previewData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={isProcessing ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Import Excel Preview
          </DialogTitle>
          <DialogDescription>
            Review the contents of <b>{previewData.fileName}</b> before importing.
            <div className="mt-2 text-blue-600 bg-blue-50 border border-blue-100 p-2 rounded text-xs font-medium">
              Note: Scheduled times in this file will be parsed according to your current local timezone.
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-bold text-gray-900">{previewData.validRows.length}</span>
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Valid Rows</span>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-bold text-gray-900">{previewData.extractedImages.length}</span>
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1 flex items-center gap-1">
              <ImageIcon className="w-3 h-3" /> Images Found
            </span>
          </div>
        </div>

        {previewData.missingColumns.length > 0 && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-start gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Missing Required Columns</p>
              <p>{previewData.missingColumns.join(", ")}</p>
            </div>
          </div>
        )}

        {previewData.invalidRows.length > 0 && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-start gap-2 mb-4 max-h-32 overflow-y-auto">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Skipping {previewData.invalidRows.length} invalid rows</p>
              <ul className="list-disc pl-4 mt-1">
                {previewData.invalidRows.slice(0, 3).map((r, i) => (
                  <li key={i}>Row {r.row}: {r.errors.join(", ")}</li>
                ))}
                {previewData.invalidRows.length > 3 && <li>...and {previewData.invalidRows.length - 3} more</li>}
              </ul>
            </div>
          </div>
        )}

        {previewData.rowWarnings && previewData.rowWarnings.length > 0 && (
          <div className="bg-amber-50 text-amber-700 p-3 rounded-lg text-sm flex items-start gap-2 mb-4 max-h-32 overflow-y-auto">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Importing {previewData.rowWarnings.length} rows with warnings</p>
              <ul className="list-disc pl-4 mt-1">
                {previewData.rowWarnings.slice(0, 3).map((r, i) => (
                  <li key={i}>Row {r.row}: {r.warnings.join(", ")}</li>
                ))}
                {previewData.rowWarnings.length > 3 && <li>...and {previewData.rowWarnings.length - 3} more</li>}
              </ul>
            </div>
          </div>
        )}

        <div className="py-2">
          <Label className="text-sm font-semibold mb-3 block">Choose Import Mode</Label>
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as ImportMode)} className="flex flex-col gap-3">
            <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => setMode("append")}>
              <RadioGroupItem value="append" id="append" />
              <Label htmlFor="append" className="cursor-pointer flex-1">
                <p className="font-medium">Append New Rows (Always Inserts)</p>
                <p className="text-xs text-muted-foreground mt-0.5">Always inserts these as {previewData.validRows.length} new rows. It does not attempt to merge or update existing ones.</p>
              </Label>
            </div>
            {/* Merging by topic/client would require matching logic in the backend, for now Append is safest for duplicates */}
            <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => setMode("replace")}>
              <RadioGroupItem value="replace" id="replace" />
              <Label htmlFor="replace" className="cursor-pointer flex-1">
                <p className="font-medium text-red-600">Replace All Content</p>
                <p className="text-xs text-muted-foreground mt-0.5">Deletes all existing posts in this workspace and replaces them with this file.</p>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {mode === "append" && (
          <div className="bg-amber-50 text-amber-700 p-3 rounded-lg text-sm flex items-start gap-2 mt-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Warning: No De-duplication</p>
              <p>This will add {previewData.validRows.length} new rows. If you already imported this file previously, this will create duplicates.</p>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm flex items-center justify-center gap-2 mt-4 animate-in fade-in">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="font-medium">{progressMessage}</span>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button 
            onClick={() => onConfirm(mode)} 
            disabled={isProcessing || previewData.validRows.length === 0 || previewData.missingColumns.length > 0}
            className={mode === "replace" ? "bg-red-600 hover:bg-red-700" : ""}
          >
            {isProcessing ? "Processing..." : `Import ${previewData.validRows.length} Rows`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
