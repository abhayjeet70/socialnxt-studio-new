import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  useSetPermissionOverride,
  useClearPermissionOverride,
  type PermissionOverride,
} from "@/lib/queries";

export function PermissionOverrideDialog({
  open,
  onOpenChange,
  permKey,
  permLabel,
  workspaceId,
  employees,
  overrides,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permKey: string;
  permLabel: string;
  workspaceId: string | undefined;
  employees: { user_id: string; name: string }[];
  overrides: PermissionOverride[];
}) {
  const setOverride = useSetPermissionOverride();
  const clearOverride = useClearPermissionOverride();
  const [selected, setSelected] = useState<string[]>([]);
  const [value, setValue] = useState(true);

  const currentOverrides = employees
    .map((e) => ({ ...e, override: overrides.find((o) => o.user_id === e.user_id)?.permissions?.[permKey] }))
    .filter((e) => e.override !== undefined);

  const toggleSelect = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const apply = () => {
    if (!workspaceId || selected.length === 0) return;
    setOverride.mutate(
      { workspace_id: workspaceId, user_ids: selected, perm_key: permKey, value },
      {
        onSuccess: () => {
          toast.success(`Override applied to ${selected.length} employee${selected.length === 1 ? "" : "s"}`);
          setSelected([]);
        },
        onError: (err: any) => toast.error("Failed to apply override: " + err.message),
      },
    );
  };

  const clear = (userId: string) => {
    if (!workspaceId) return;
    clearOverride.mutate(
      { workspace_id: workspaceId, user_id: userId, perm_key: permKey },
      { onSuccess: () => toast.success("Reverted to role default") },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Per-employee override — {permLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {currentOverrides.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Current overrides</div>
              <div className="space-y-1.5">
                {currentOverrides.map((e) => (
                  <div key={e.user_id} className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-1.5 text-sm">
                    <span>{e.name}</span>
                    <div className="flex items-center gap-3">
                      <span className={e.override ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                        {e.override ? "Granted" : "Denied"}
                      </span>
                      <button onClick={() => clear(e.user_id)} className="text-xs text-muted-foreground hover:text-red-500 underline">
                        Revert to role default
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Apply new override</div>
            {employees.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No employees in this workspace yet.</p>
            ) : (
              <div className="border border-border rounded-lg max-h-48 overflow-y-auto divide-y divide-border">
                {employees.map((e) => (
                  <label key={e.user_id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/30">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={selected.includes(e.user_id)}
                      onChange={() => toggleSelect(e.user_id)}
                    />
                    {e.name}
                  </label>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <Switch checked={value} onCheckedChange={setValue} />
                <span className="text-sm">{value ? "Grant" : "Deny"} this permission</span>
              </div>
              <Button size="sm" onClick={apply} disabled={selected.length === 0 || setOverride.isPending}>
                Apply{selected.length > 0 ? ` to ${selected.length}` : ""}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
