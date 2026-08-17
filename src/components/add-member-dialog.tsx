import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, Loader2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { createAccount } from "@/lib/admin-api";

type InviteRole = "client" | "Social Media Manager" | "Designer" | "Video Editor";

export function AddMemberDialog({
  open,
  onOpenChange,
  workspaceId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | undefined;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<InviteRole>("Social Media Manager");
  const [isSending, setIsSending] = useState(false);

  const reset = () => {
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setRole("Social Media Manager");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    setIsSending(true);
    try {
      await createAccount({
        name,
        email,
        phone,
        password,
        role: role === "client" ? "client" : "employee",
        agencyRole: role === "client" ? undefined : role,
        workspaceId,
      });
      toast.success(`Account created for ${email}!`);
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast.error("Failed to create account: " + (err.message || "Unknown error"));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a Team Member</DialogTitle>
          <DialogDescription>Create an account for your new team member.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="am-name">Full Name</Label>
            <Input id="am-name" required placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="am-email">Email Address</Label>
            <Input id="am-email" type="email" required placeholder="colleague@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="am-phone">Phone Number</Label>
            <Input id="am-phone" type="tel" required pattern="\d{10}" title="Phone number must be exactly 10 digits" placeholder="1234567890" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="am-password">Password</Label>
            <div className="relative">
              <Input id="am-password" type={showPassword ? "text" : "password"} required minLength={6} placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="am-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as InviteRole)}>
              <SelectTrigger id="am-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="Social Media Manager">Employee: Social Media Manager</SelectItem>
                <SelectItem value="Designer">Employee: Designer</SelectItem>
                <SelectItem value="Video Editor">Employee: Video Editor</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {role === "client" ? "Clients can view and approve content on the calendar." : `Employees (${role}) can create and manage content based on their role.`}
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isSending}>
            {isSending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
            ) : (
              <><UserCheck className="h-4 w-4 mr-2" /> Create Account</>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
