import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Building2, Rocket, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STEPS = [
  { icon: Rocket, label: "Create Account" },
  { icon: Building2, label: "Setup Workspace" },
  { icon: Sparkles, label: "Start Managing" },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const [agencyName, setAgencyName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyName.trim()) return;
    setIsLoading(true);
    setErrorMsg("");

    try {
      // 1. Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Not authenticated");

      // 2. Create workspace (generate ID client-side so we don't need to .select() it back, which would fail RLS since member isn't added yet)
      const workspaceId = crypto.randomUUID();
      const { error: wsError } = await supabase
        .from("workspaces")
        .insert({ id: workspaceId, name: agencyName.trim() });
      if (wsError) throw wsError;

      // 3. Add current user as admin
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspaceId,
          user_id: user.id,
          role: "admin",
        });
      if (memberError) {
        console.error("Member Insert Error:", memberError);
        throw memberError;
      }

      // 4. Navigate to dashboard
      navigate("/");
    } catch (err: any) {
      console.error("Onboarding Error:", err);
      setErrorMsg(err?.message || err?.error_description || JSON.stringify(err) || "Something went wrong.");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f0f4ff] via-[#f7f9fd] to-[#eef2ff] flex items-center justify-center p-4">
      <div className="w-full max-w-[520px]">

        {/* Logo */}
        <div className="flex justify-center mb-10">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11">
              <div className="absolute inset-1 rotate-[30deg] rounded-[10px] bg-[#2d6bff]" />
              <div className="absolute left-3 top-3 h-3 w-6 rotate-[30deg] rounded-sm border-[5px] border-[#081b61] border-r-transparent border-t-transparent" />
              <div className="absolute bottom-3 left-2 h-3 w-6 rotate-[30deg] rounded-sm border-[5px] border-[#081b61] border-b-transparent border-l-transparent" />
            </div>
            <span className="text-[1.85rem] font-bold tracking-normal text-[#061b62]">SocialNxt</span>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-0 mb-10">
          {STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                i === 0 ? "bg-green-100 text-green-700" :
                i === 1 ? "bg-[#0828ff]/10 text-[#0828ff]" :
                "bg-gray-100 text-gray-400"
              }`}>
                <step.icon className="h-3.5 w-3.5" />
                {step.label}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-8 mx-1 ${i === 0 ? "bg-green-300" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#e3e8f3] shadow-[0_18px_50px_rgba(9,20,55,0.10)] p-8">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-[#0828ff]/10 grid place-items-center">
              <Building2 className="h-7 w-7 text-[#0828ff]" />
            </div>
            <h1 className="text-2xl font-bold text-[#091437]">Set up your Agency Workspace</h1>
            <p className="mt-2 text-sm text-[#6b7a9b]">
              This is your agency's home in SocialNxt. You can change this name later.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-5">
            {errorMsg && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{errorMsg}</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="agencyName" className="text-sm font-semibold text-[#182652]">
                Agency / Workspace Name
              </Label>
              <Input
                id="agencyName"
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder="e.g. SocialNxt Agency, Brand Studio..."
                required
                autoFocus
                className="h-[54px] rounded-lg border-[#cfd8e8] bg-white px-4 text-base text-[#091437] shadow-none placeholder:text-[#9aa8c4] focus-visible:ring-[#153dff]"
              />
              <p className="text-xs text-[#9aa8c4]">
                Your employees and clients will see this name.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !agencyName.trim()}
              className="h-[54px] w-full rounded-lg bg-[#0828ff] text-base font-semibold text-white shadow-[0_12px_25px_rgba(8,40,255,0.25)] transition-colors hover:bg-[#001bd1] disabled:opacity-60"
            >
              {isLoading ? "Creating workspace..." : "Create Workspace & Continue →"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[#9aa8c4] mt-6">
          You are the admin of this workspace. Invite your team after setup.
        </p>
      </div>
    </main>
  );
}
