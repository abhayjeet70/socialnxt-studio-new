import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useState, useEffect } from "react";
import { Check, Eye, FileText, Image, LayoutGrid, Play, UsersRound, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in - SocialNxt CRM" }] }),
  component: LoginPage,
});

const benefits = [
  "Manage clients, projects, tasks and content in one place",
  "Track team performance and productivity",
  "Secure, fast and reliable",
];

function SocialNxtLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-11 w-11">
        <div className="absolute inset-1 rotate-[30deg] rounded-[10px] bg-[#2d6bff]" />
        <div className="absolute left-3 top-3 h-3 w-6 rotate-[30deg] rounded-sm border-[5px] border-[#081b61] border-r-transparent border-t-transparent" />
        <div className="absolute bottom-3 left-2 h-3 w-6 rotate-[30deg] rounded-sm border-[5px] border-[#081b61] border-b-transparent border-l-transparent" />
      </div>
      <span className="text-[1.85rem] font-bold tracking-normal text-white">SocialNxt</span>
    </div>
  );
}

function FloatingTile({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div
      className={`absolute grid h-14 w-14 place-items-center rounded-xl border border-white/15 bg-blue-500/90 text-white shadow-[0_18px_40px_rgba(38,87,255,0.35)] ${className}`}
    >
      {children}
    </div>
  );
}

function LoginIllustration() {
  return (
    <div className="relative mx-auto mt-8 h-[360px] w-full max-w-[500px]">
      <div className="absolute bottom-0 left-1/2 h-28 w-[410px] -translate-x-1/2 rounded-[50%] bg-[#092986] shadow-[inset_0_0_0_2px_rgba(66,118,255,0.4)]" />
      <div className="absolute bottom-14 left-1/2 h-7 w-[250px] -translate-x-1/2 rounded-b-3xl bg-[#5b8bff] shadow-[0_20px_35px_rgba(0,0,0,0.35)]" />
      <div className="absolute bottom-[86px] left-1/2 h-[118px] w-[230px] -translate-x-1/2 -skew-y-6 rounded-xl border border-blue-200/40 bg-[#8bb2ff] p-3 shadow-[0_24px_45px_rgba(0,0,0,0.35)]">
        <div className="h-full rounded-lg bg-[#071a64] p-3">
          <div className="h-full rounded-md bg-white p-3">
            <div className="mb-2 h-2 w-16 rounded-full bg-[#152e83]" />
            <div className="grid grid-cols-[1fr_78px] gap-3">
              <div className="space-y-2">
                <div className="h-3 rounded-full bg-[#ffd2e3]" />
                <div className="h-3 w-4/5 rounded-full bg-[#8f8cff]" />
                <div className="h-3 w-2/3 rounded-full bg-[#53d0ff]" />
                <div className="flex gap-2 pt-1">
                  <div className="h-8 w-8 rounded-full bg-[conic-gradient(#2f6bff_0_42%,#16c8a1_42%_66%,#ff8f71_66%_100%)]" />
                  <div className="h-8 w-8 rounded-full bg-[conic-gradient(#7b4cff_0_34%,#44c7ff_34%_72%,#ffd15a_72%_100%)]" />
                </div>
              </div>
              <div className="flex items-end gap-1.5">
                <div className="h-8 w-4 rounded-t-sm bg-[#ffb15f]" />
                <div className="h-12 w-4 rounded-t-sm bg-[#7b64ff]" />
                <div className="h-16 w-4 rounded-t-sm bg-[#30b7ff]" />
                <div className="h-10 w-4 rounded-t-sm bg-[#ffa3c1]" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-[57px] left-1/2 h-20 w-[265px] -translate-x-1/2 skew-x-[-28deg] rounded-sm bg-[#76a2ff]" />
      <div className="absolute bottom-[72px] left-[calc(50%-80px)] h-10 w-[92px] skew-x-[-28deg] rounded bg-[#0b2a86]" />
      <div className="absolute bottom-[82px] left-[calc(50%-14px)] grid grid-cols-5 gap-1">
        {Array.from({ length: 20 }).map((_, index) => (
          <span key={index} className="h-1.5 w-4 rounded-sm bg-[#183da6]" />
        ))}
      </div>

      <FloatingTile className="left-12 top-48 bg-[#125bff]">
        <LayoutGrid className="h-7 w-7" />
      </FloatingTile>
      <FloatingTile className="left-[104px] top-[108px] bg-[#0ba8ff]">
        <FileText className="h-7 w-7" />
      </FloatingTile>
      <FloatingTile className="right-[128px] top-20 bg-[#6536ff]">
        <Image className="h-7 w-7" />
      </FloatingTile>
      <FloatingTile className="right-14 top-[135px] bg-[#6f35ff]">
        <Play className="h-7 w-7" />
      </FloatingTile>
      <FloatingTile className="right-[74px] top-48 bg-[#132c8c]/70 text-blue-300">
        <UsersRound className="h-7 w-7" />
      </FloatingTile>

      <div className="absolute bottom-12 right-28 h-24 w-16">
        <div className="absolute bottom-0 left-6 h-16 w-7 rounded-full bg-[#18c982]" />
        <div className="absolute bottom-2 left-0 h-14 w-7 rotate-[35deg] rounded-full bg-[#26d49b]" />
        <div className="absolute bottom-2 right-0 h-14 w-7 -rotate-[35deg] rounded-full bg-[#13a96f]" />
        <div className="absolute bottom-0 left-2 h-10 w-12 rounded-b-xl rounded-t-sm bg-white shadow-lg" />
      </div>

      <div className="absolute left-[92px] top-58 h-16 border-l border-dashed border-blue-300/30" />
      <div className="absolute right-[78px] top-76 h-20 border-l border-dashed border-blue-300/30" />
      <div className="absolute right-[48px] bottom-[115px] h-24 border-l border-blue-300/25">
        <div className="-ml-1 -mt-1 h-2 w-2 rotate-45 border-l border-t border-blue-300/50" />
      </div>
      <div className="absolute left-[245px] bottom-[138px] h-20 border-l border-blue-300/25">
        <div className="-ml-1 -mt-1 h-2 w-2 rotate-45 border-l border-t border-blue-300/50" />
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <span className="text-xl font-bold leading-none">
      <span className="text-[#4285f4]">G</span>
    </span>
  );
}

function MicrosoftMark() {
  return (
    <span className="grid h-5 w-5 grid-cols-2 gap-0.5">
      <span className="bg-[#f25022]" />
      <span className="bg-[#7fba00]" />
      <span className="bg-[#00a4ef]" />
      <span className="bg-[#ffb900]" />
    </span>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "set_password" | "forgot_password">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Detect if this is an invite callback from Supabase (URL has #type=invite or #type=recovery)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=invite") || hash.includes("type=recovery")) {
      // Supabase sets the session from the hash automatically
      // We just need to show the set-password form
      setMode("set_password");
    }
  }, []);

  const switchMode = (m: "signin" | "signup") => {
    setMode(m);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setErrorMsg("Please enter your email address."); return; }
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setIsLoading(false);
    if (error) { setErrorMsg(error.message); return; }
    setSuccessMsg("Password reset email sent! Check your inbox and click the link to set a new password.");
  };

  const handleSetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    setIsLoading(true);
    setErrorMsg("");
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) { setErrorMsg(error.message); return; }
    setSuccessMsg("Password set! Redirecting to your dashboard...");
    setTimeout(() => navigate({ to: "/" }), 1500);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    if (mode === "signin") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      setIsLoading(false);
      if (error) { setErrorMsg(error.message); return; }
      if (data.session) navigate({ to: "/" });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      setIsLoading(false);
      if (error) { setErrorMsg(error.message); return; }
      if (data.user) {
        setSuccessMsg("Account created! Check your email to confirm, then sign in.");
        switchMode("signin");
      }
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  const isSignUp = mode === "signup";

  return (
    <main className="min-h-screen bg-[#f7f9fd] p-3 text-[#091437] sm:p-4">
      <section className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1380px] overflow-hidden rounded-2xl border border-[#e3e8f3] bg-white shadow-[0_18px_50px_rgba(9,20,55,0.12)] lg:min-h-[calc(100vh-2rem)] lg:grid-cols-[1.03fr_1fr]">
        <aside className="relative hidden overflow-hidden bg-[#061b62] px-10 py-12 text-white lg:block xl:px-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_45%,rgba(14,56,255,0.95),rgba(6,27,98,0.2)_34%,rgba(2,12,46,0)_64%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#061239_0%,#071c65_52%,#08237a_100%)]" />
          <div className="relative z-10">
            <SocialNxtLogo />
            <div className="mt-12 max-w-[390px]">
              <h1 className="text-3xl font-bold leading-tight tracking-normal">
                All-in-one CRM for Social Media Management
              </h1>
              <div className="mt-8 space-y-5">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-4">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#1867ff]">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </span>
                    <p className="max-w-[310px] text-base leading-7 text-white/90">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
            <LoginIllustration />
          </div>
        </aside>

        <div className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-14">
          <div className="w-full max-w-[510px]">
            <div className="mb-10 flex justify-center lg:hidden">
              <div className="rounded-xl bg-[#061b62] px-5 py-3">
                <SocialNxtLogo />
              </div>
            </div>

            {/* Set Password Mode (invite/reset flow) */}
            {mode === "set_password" ? (
              <>
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100">
                    <KeyRound className="h-7 w-7 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-normal">Set your password</h2>
                  <p className="mt-2 text-sm text-[#6b7a9b]">
                    You've been invited! Create a password to access your workspace.
                  </p>
                </div>

                <form className="space-y-5" onSubmit={handleSetPassword}>
                  {errorMsg && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{errorMsg}</div>
                  )}
                  {successMsg && (
                    <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{successMsg}</div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-sm font-semibold text-[#182652]">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        required
                        className="h-[54px] rounded-lg border-[#cfd8e8] bg-white px-4 pr-12 text-base"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8b9ab8] hover:text-[#153dff]"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-sm font-semibold text-[#182652]">
                      Confirm Password
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      required
                      className="h-[54px] rounded-lg border-[#cfd8e8] bg-white px-4 text-base"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-[54px] w-full rounded-lg bg-[#0828ff] text-base font-semibold text-white shadow-[0_12px_25px_rgba(8,40,255,0.25)] hover:bg-[#001bd1]"
                  >
                    {isLoading ? "Setting password..." : "Set Password & Enter Workspace"}
                  </Button>
                </form>
              </>
            ) : mode === "forgot_password" ? (
              <>
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100">
                    <KeyRound className="h-7 w-7 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-normal">Reset your password</h2>
                  <p className="mt-2 text-sm text-[#6b7a9b]">
                    Enter your email and we'll send you a reset link.
                  </p>
                </div>

                <form className="space-y-5" onSubmit={handleForgotPassword}>
                  {errorMsg && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{errorMsg}</div>
                  )}
                  {successMsg && (
                    <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{successMsg}</div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-sm font-semibold text-[#182652]">
                      Email address
                    </Label>
                    <input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="h-[54px] w-full rounded-lg border border-[#cfd8e8] bg-white px-4 text-base text-[#091437] placeholder:text-[#9aa8c4] focus:outline-none focus:ring-2 focus:ring-[#153dff]"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-[54px] w-full rounded-lg bg-[#0828ff] text-base font-semibold text-white shadow-[0_12px_25px_rgba(8,40,255,0.25)] hover:bg-[#001bd1] disabled:opacity-70"
                  >
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Button>

                  <button
                    type="button"
                    onClick={() => { setMode("signin"); setErrorMsg(""); setSuccessMsg(""); }}
                    className="w-full text-center text-sm font-semibold text-[#073cff] hover:underline"
                  >
                    ← Back to Sign In
                  </button>
                </form>
              </>
            ) : (
              <>
            {/* Mode Tabs */}
            <div className="flex rounded-xl bg-[#f1f4fb] p-1 mb-8">
              <button
                type="button"
                id="tab-signin"
                onClick={() => switchMode("signin")}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  !isSignUp ? "bg-white text-[#091437] shadow-sm" : "text-[#6b7a9b] hover:text-[#091437]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                id="tab-signup"
                onClick={() => switchMode("signup")}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  isSignUp ? "bg-white text-[#091437] shadow-sm" : "text-[#6b7a9b] hover:text-[#091437]"
                }`}
              >
                Create Account
              </button>
            </div>

            <h2 className="text-center text-2xl font-bold tracking-normal sm:text-[1.7rem]">
              {isSignUp ? "Create your admin account" : "Sign in to your account"}
            </h2>
            {isSignUp && (
              <p className="text-center text-sm text-[#6b7a9b] mt-1">
                You'll set up your agency workspace next.
              </p>
            )}

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              {errorMsg && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{errorMsg}</div>
              )}
              {successMsg && (
                <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{successMsg}</div>
              )}

              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-semibold text-[#182652]">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ishanshu Sharma"
                    required={isSignUp}
                    className="h-[54px] rounded-lg border-[#cfd8e8] bg-white px-4 text-base text-[#091437] shadow-none placeholder:text-[#9aa8c4] focus-visible:ring-[#153dff]"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-[#182652]">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="h-[54px] rounded-lg border-[#cfd8e8] bg-white px-4 text-base text-[#091437] shadow-none placeholder:text-[#9aa8c4] focus-visible:ring-[#153dff]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-[#182652]">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isSignUp ? "Min. 6 characters" : "Enter your password"}
                    required
                    className="h-[54px] rounded-lg border-[#cfd8e8] bg-white px-4 pr-12 text-base text-[#091437] shadow-none placeholder:text-[#9aa8c4] focus-visible:ring-[#153dff]"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-[#8b9ab8] transition-colors hover:text-[#153dff]"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {!isSignUp && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#26355f]">
                    <Checkbox className="h-4 w-4 rounded-[3px] border-[#153dff] data-[state=checked]:bg-[#153dff]" />
                    Remember me
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode("forgot_password"); setErrorMsg(""); setSuccessMsg(""); }}
                    className="text-sm font-semibold text-[#073cff] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="h-[54px] w-full rounded-lg bg-[#0828ff] text-base font-semibold text-white shadow-[0_12px_25px_rgba(8,40,255,0.25)] transition-colors hover:bg-[#001bd1] disabled:opacity-70"
              >
                {isLoading
                  ? isSignUp ? "Creating account..." : "Signing in..."
                  : isSignUp ? "Create Admin Account" : "Sign In"}
              </Button>
            </form>

            <div className="my-7 flex items-center gap-6 text-sm font-medium text-[#26355f]">
              <span className="h-px flex-1 bg-[#d7deeb]" />
              <span>or continue with</span>
              <span className="h-px flex-1 bg-[#d7deeb]" />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                className="h-[54px] rounded-lg border-[#cfd8e8] bg-white text-base font-semibold text-[#101b3f] shadow-none hover:bg-[#f8faff]"
              >
                <GoogleMark />
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-[54px] rounded-lg border-[#cfd8e8] bg-white text-base font-semibold text-[#101b3f] shadow-none hover:bg-[#f8faff]"
              >
                <MicrosoftMark />
                Microsoft
              </Button>
            </div>
          </>
          )}
          </div>
        </div>
      </section>
    </main>
  );
}
