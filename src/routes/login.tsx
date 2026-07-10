import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useState, useEffect } from "react";
import { Check, Eye, FileText, Image, LayoutGrid, Play, UsersRound, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.png";

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
    <div className="flex items-center">
      <div className="bg-white px-4 py-2 rounded-xl shadow-sm">
        <img src={logo} alt="SocialNxt Logo" className="h-10 w-auto object-contain" />
      </div>
    </div>
  );
}

function FloatingTile({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div
      className={`absolute grid h-14 w-14 place-items-center rounded-xl border border-white/15 bg-purple-500/90 text-white shadow-[0_18px_40px_rgba(109,40,217,0.35)] ${className}`}
    >
      {children}
    </div>
  );
}

function LoginIllustration() {
  return (
    <div className="relative mx-auto mt-8 h-[360px] w-full max-w-[500px]">
      <div className="absolute bottom-0 left-1/2 h-28 w-[410px] -translate-x-1/2 rounded-[50%] bg-[#2d0d6b] shadow-[inset_0_0_0_2px_rgba(139,92,246,0.4)]" />
      <div className="absolute bottom-14 left-1/2 h-7 w-[250px] -translate-x-1/2 rounded-b-3xl bg-[#7c3aed] shadow-[0_20px_35px_rgba(0,0,0,0.35)]" />
      <div className="absolute bottom-[86px] left-1/2 h-[118px] w-[230px] -translate-x-1/2 -skew-y-6 rounded-xl border border-purple-200/40 bg-[#a78bfa] p-3 shadow-[0_24px_45px_rgba(0,0,0,0.35)]">
        <div className="h-full rounded-lg bg-[#2e1065] p-3">
          <div className="h-full rounded-md bg-white p-3">
            <div className="mb-2 h-2 w-16 rounded-full bg-[#4c1d95]" />
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
                <div className="h-12 w-4 rounded-t-sm bg-[#7c3aed]" />
                <div className="h-16 w-4 rounded-t-sm bg-[#30b7ff]" />
                <div className="h-10 w-4 rounded-t-sm bg-[#ffa3c1]" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-[57px] left-1/2 h-20 w-[265px] -translate-x-1/2 skew-x-[-28deg] rounded-sm bg-[#a78bfa]" />
      <div className="absolute bottom-[72px] left-[calc(50%-80px)] h-10 w-[92px] skew-x-[-28deg] rounded bg-[#3b0764]" />
      <div className="absolute bottom-[82px] left-[calc(50%-14px)] grid grid-cols-5 gap-1">
        {Array.from({ length: 20 }).map((_, index) => (
          <span key={index} className="h-1.5 w-4 rounded-sm bg-[#4c1d95]" />
        ))}
      </div>

      <FloatingTile className="left-12 top-48 bg-[#6d28d9]">
        <LayoutGrid className="h-7 w-7" />
      </FloatingTile>
      <FloatingTile className="left-[104px] top-[108px] bg-[#7c3aed]">
        <FileText className="h-7 w-7" />
      </FloatingTile>
      <FloatingTile className="right-[128px] top-20 bg-[#8b5cf6]">
        <Image className="h-7 w-7" />
      </FloatingTile>
      <FloatingTile className="right-14 top-[135px] bg-[#9333ea]">
        <Play className="h-7 w-7" />
      </FloatingTile>
      <FloatingTile className="right-[74px] top-48 bg-[#3b0764]/70 text-purple-300">
        <UsersRound className="h-7 w-7" />
      </FloatingTile>

      <div className="absolute bottom-12 right-28 h-24 w-16">
        <div className="absolute bottom-0 left-6 h-16 w-7 rounded-full bg-[#18c982]" />
        <div className="absolute bottom-2 left-0 h-14 w-7 rotate-[35deg] rounded-full bg-[#26d49b]" />
        <div className="absolute bottom-2 right-0 h-14 w-7 -rotate-[35deg] rounded-full bg-[#13a96f]" />
        <div className="absolute bottom-0 left-2 h-10 w-12 rounded-b-xl rounded-t-sm bg-white shadow-lg" />
      </div>

      <div className="absolute left-[92px] top-58 h-16 border-l border-dashed border-purple-300/30" />
      <div className="absolute right-[78px] top-76 h-20 border-l border-dashed border-purple-300/30" />
      <div className="absolute right-[48px] bottom-[115px] h-24 border-l border-purple-300/25">
        <div className="-ml-1 -mt-1 h-2 w-2 rotate-45 border-l border-t border-purple-300/50" />
      </div>
      <div className="absolute left-[245px] bottom-[138px] h-20 border-l border-purple-300/25">
        <div className="-ml-1 -mt-1 h-2 w-2 rotate-45 border-l border-t border-purple-300/50" />
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

  // ⚠️ DEV ONLY — one-click sign in. Remove before production.
  const DEV_EMAIL = "dev@socialnxt.test";
  const DEV_PASSWORD = "devpassword123";
  const handleDevSignIn = async () => {
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    // Try sign in; if the dev account doesn't exist yet, create it, then sign in.
    let { data, error } = await supabase.auth.signInWithPassword({
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
    });
    if (error) {
      const { error: signUpError } = await supabase.auth.signUp({
        email: DEV_EMAIL,
        password: DEV_PASSWORD,
        options: { data: { full_name: "Dev User" } },
      });
      if (signUpError && !signUpError.message.toLowerCase().includes("already")) {
        setIsLoading(false);
        setErrorMsg(signUpError.message);
        return;
      }
      ({ data, error } = await supabase.auth.signInWithPassword({
        email: DEV_EMAIL,
        password: DEV_PASSWORD,
      }));
    }
    setIsLoading(false);
    if (error) {
      setErrorMsg(
        error.message +
          " — if email confirmation is ON, disable it in Supabase → Auth → Providers for dev.",
      );
      return;
    }
    if (data.session) navigate({ to: "/" });
  };

  const isSignUp = mode === "signup";

  return (
    <main className="min-h-screen bg-[#f5f3ff] p-3 text-[#1e0a3c] sm:p-4">
      <section className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1380px] overflow-hidden rounded-2xl border border-[#e9e3f8] bg-white shadow-[0_18px_50px_rgba(76,29,149,0.12)] lg:min-h-[calc(100vh-2rem)] lg:grid-cols-[1.03fr_1fr]">
        <aside className="relative hidden overflow-hidden bg-[#2e0069] px-10 py-12 text-white lg:block xl:px-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_45%,rgba(124,58,237,0.95),rgba(46,0,105,0.2)_34%,rgba(20,0,50,0)_64%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#1a0050_0%,#3b0764_52%,#4c1d95_100%)]" />
          <div className="relative z-10">
            <SocialNxtLogo />
            <div className="mt-12 max-w-[390px]">
              <h1 className="text-3xl font-bold leading-tight tracking-normal">
                All-in-one CRM for Social Media Management
              </h1>
              <div className="mt-8 space-y-5">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-4">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#7c3aed]">
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
              <div className="rounded-xl bg-[#2e0069] px-5 py-3">
                <SocialNxtLogo />
              </div>
            </div>

            {/* Set Password Mode (invite/reset flow) */}
            {mode === "set_password" ? (
              <>
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100">
                    <KeyRound className="h-7 w-7 text-purple-600" />
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
                    <Label htmlFor="new-password" className="text-sm font-semibold text-[#2e1065]">
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
                        className="h-[54px] rounded-lg border-[#d8c9f8] bg-white px-4 pr-12 text-base"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8b9ab8] hover:text-[#7c3aed]"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-sm font-semibold text-[#2e1065]">
                      Confirm Password
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      required
                      className="h-[54px] rounded-lg border-[#d8c9f8] bg-white px-4 text-base"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-[54px] w-full rounded-lg bg-[#7c3aed] text-base font-semibold text-white shadow-[0_12px_25px_rgba(124,58,237,0.35)] hover:bg-[#6d28d9]"
                  >
                    {isLoading ? "Setting password..." : "Set Password & Enter Workspace"}
                  </Button>
                </form>
              </>
            ) : mode === "forgot_password" ? (
              <>
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100">
                    <KeyRound className="h-7 w-7 text-purple-600" />
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
                      className="h-[54px] w-full rounded-lg border border-[#d8c9f8] bg-white px-4 text-base text-[#1e0a3c] placeholder:text-[#9aa8c4] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-[54px] w-full rounded-lg bg-[#7c3aed] text-base font-semibold text-white shadow-[0_12px_25px_rgba(124,58,237,0.35)] hover:bg-[#6d28d9] disabled:opacity-70"
                  >
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Button>

                  <button
                    type="button"
                    onClick={() => { setMode("signin"); setErrorMsg(""); setSuccessMsg(""); }}
                    className="w-full text-center text-sm font-semibold text-[#7c3aed] hover:underline"
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
                  !isSignUp ? "bg-white text-[#1e0a3c] shadow-sm" : "text-[#6b7a9b] hover:text-[#1e0a3c]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                id="tab-signup"
                onClick={() => switchMode("signup")}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  isSignUp ? "bg-white text-[#1e0a3c] shadow-sm" : "text-[#6b7a9b] hover:text-[#1e0a3c]"
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
                  <Label htmlFor="fullName" className="text-sm font-semibold text-[#2e1065]">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ishanshu Sharma"
                    required={isSignUp}
                    className="h-[54px] rounded-lg border-[#d8c9f8] bg-white px-4 text-base text-[#1e0a3c] shadow-none placeholder:text-[#9aa8c4] focus-visible:ring-[#7c3aed]"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-[#2e1065]">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="h-[54px] rounded-lg border-[#d8c9f8] bg-white px-4 text-base text-[#1e0a3c] shadow-none placeholder:text-[#9aa8c4] focus-visible:ring-[#7c3aed]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-[#2e1065]">
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
                    className="h-[54px] rounded-lg border-[#d8c9f8] bg-white px-4 pr-12 text-base text-[#1e0a3c] shadow-none placeholder:text-[#9aa8c4] focus-visible:ring-[#7c3aed]"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-[#8b9ab8] transition-colors hover:text-[#7c3aed]"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {!isSignUp && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#3b0764]">
                    <Checkbox className="h-4 w-4 rounded-[3px] border-[#7c3aed] data-[state=checked]:bg-[#7c3aed]" />
                    Remember me
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode("forgot_password"); setErrorMsg(""); setSuccessMsg(""); }}
                    className="text-sm font-semibold text-[#7c3aed] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="h-[54px] w-full rounded-lg bg-[#7c3aed] text-base font-semibold text-white shadow-[0_12px_25px_rgba(124,58,237,0.35)] transition-colors hover:bg-[#6d28d9] disabled:opacity-70"
              >
                {isLoading
                  ? isSignUp ? "Creating account..." : "Signing in..."
                  : isSignUp ? "Create Admin Account" : "Sign In"}
              </Button>

              {/* ⚠️ DEV ONLY — remove later */}
              <button
                type="button"
                onClick={handleDevSignIn}
                disabled={isLoading}
                className="h-11 w-full rounded-lg border border-dashed border-[#c4b5fd] bg-[#f5f3ff] text-sm font-semibold text-[#7c3aed] transition-colors hover:bg-[#ede9fe] disabled:opacity-70"
              >
                ⚡ Dev Quick Sign In (temporary)
              </button>
            </form>

          </>
          )}
          </div>
        </div>
      </section>
    </main>
  );
}
