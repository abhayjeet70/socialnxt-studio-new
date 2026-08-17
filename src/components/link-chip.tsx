import { Link as LinkIcon } from "lucide-react";
import type { LinkEntry } from "@/lib/queries";

const SHORT_URL_THRESHOLD = 40;

/** name+url when the url is short enough to read inline; name-only (clickable) otherwise. */
export function linkLabel(entry: LinkEntry, index: number): string {
  const name = entry.name?.trim();
  if (!name) return entry.url;
  return entry.url.length <= SHORT_URL_THRESHOLD ? `${name} — ${entry.url}` : name;
}

export function LinkChip({
  entry,
  index,
  onRemove,
  className = "",
}: {
  entry: LinkEntry;
  index: number;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 shrink-0 ${className}`}
    >
      <a href={entry.url} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1 min-w-0">
        <LinkIcon className="w-3 h-3 shrink-0" />
        <span className="truncate max-w-[220px]">{linkLabel(entry, index)}</span>
      </a>
      {onRemove && (
        <button type="button" onClick={onRemove} className="text-blue-400 hover:text-red-500 shrink-0" title="Remove link">
          ×
        </button>
      )}
    </span>
  );
}
