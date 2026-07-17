import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Check, Eye, KeyRound } from "lucide-react";
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
      <div className="bg-white rounded-xl shadow-sm overflow-hidden flex items-center justify-center w-[220px] h-[64px]">
        <img src={logo} alt="SocialNxt Logo" className="w-full h-full object-contain scale-[3] -translate-y-[2px]" />
      </div>
    </div>
  );
}

/* ─── Social Media SVG Logos ─── */
function InstagramLogo() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ig-grad1" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497"/>
          <stop offset="5%" stopColor="#fdf497"/>
          <stop offset="45%" stopColor="#fd5949"/>
          <stop offset="60%" stopColor="#d6249f"/>
          <stop offset="90%" stopColor="#285AEB"/>
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad1)"/>
      <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none"/>
      <circle cx="17.5" cy="6.5" r="1.2" fill="white"/>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="white" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}

function FacebookLogo() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#1877F2"/>
      <path d="M16 8h-2a1 1 0 00-1 1v2h3l-.5 3H13v7h-3v-7H8v-3h2V9a4 4 0 014-4h2v3z" fill="white"/>
    </svg>
  );
}

function LinkedInLogo() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#0A66C2"/>
      <rect x="4" y="9" width="3" height="11" fill="white"/>
      <circle cx="5.5" cy="5.5" r="1.8" fill="white"/>
      <path d="M9.5 9h2.8v1.5C12.8 9.6 14 9 15.3 9c2.5 0 3.7 1.7 3.7 4.5V20h-3v-5.8c0-1.3-.3-2.2-1.5-2.2s-2 .9-2 2.3V20h-3V9z" fill="white"/>
    </svg>
  );
}

function YouTubeLogo() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#FF0000"/>
      <path d="M20.9 7.5s-.2-1.4-.8-2c-.8-.8-1.7-.8-2.1-.9C15.5 4.5 12 4.5 12 4.5s-3.5 0-6 .1c-.4.1-1.3.1-2.1.9-.6.6-.8 2-.8 2S3 9.1 3 10.7v1.5c0 1.6.1 3.2.1 3.2s.2 1.4.8 2c.8.8 1.8.8 2.3.9C7.7 18.5 12 18.5 12 18.5s3.5 0 6-.1c.4-.1 1.3-.1 2.1-.9.6-.6.8-2 .8-2S21 14.9 21 13.3v-1.5c0-1.6-.1-3.3-.1-3.3z" fill="#FF0000"/>
      <path d="M10.5 15V9l5.5 3-5.5 3z" fill="white"/>
    </svg>
  );
}

function TikTokLogo() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#010101"/>
      <path d="M17 6.7c-.9-.6-1.5-1.5-1.7-2.7H13v10.3c0 1.2-.9 2.2-2.1 2.2a2.1 2.1 0 01-2.1-2.1c0-1.2.9-2.1 2.1-2.1.2 0 .4 0 .6.1V10a5 5 0 00-.6 0 4.8 4.8 0 000 9.5 4.8 4.8 0 004.9-4.8V9.3c.8.5 1.8.8 2.8.8V7.4A3.5 3.5 0 0117 6.7z" fill="white"/>
      <path d="M17 6.7c-.9-.6-1.5-1.5-1.7-2.7H13v10.3c0 1.2-.9 2.2-2.1 2.2a2.1 2.1 0 01-2.1-2.1c0-1.2.9-2.1 2.1-2.1.2 0 .4 0 .6.1V10a5 5 0 00-.6 0 4.8 4.8 0 000 9.5 4.8 4.8 0 004.9-4.8V9.3c.8.5 1.8.8 2.8.8V7.4A3.5 3.5 0 0117 6.7z" fill="#69C9D0" opacity="0.5"/>
    </svg>
  );
}

/* ─── Floating Social Logo Tile ─── */
interface SocialTileProps {
  style?: React.CSSProperties;
  animClass: string;
  children: React.ReactNode;
  glowColor?: string;
}

function SocialTile({ style, animClass, children, glowColor = "rgba(109,40,217,0.4)" }: SocialTileProps) {
  return (
    <div
      className={`absolute grid h-[52px] w-[52px] place-items-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm shadow-lg ${animClass}`}
      style={{ boxShadow: `0 8px 32px ${glowColor}, 0 2px 8px rgba(0,0,0,0.3)`, ...style }}
    >
      {children}
    </div>
  );
}


/* ─── Illustration (laptop screen + 5 social logos) ─── */
function LoginIllustration() {
  return (
    <div className="relative mx-auto mt-10 h-[340px] w-full max-w-[460px]">
      {/* glow platform ring */}
      <div className="absolute bottom-0 left-1/2 h-20 w-[380px] -translate-x-1/2 rounded-[50%] bg-[#2d0d6b]/80 blur-sm" />

      {/* laptop hinge/base */}
      <div className="absolute bottom-16 left-1/2 h-5 w-[220px] -translate-x-1/2 rounded-b-2xl bg-[#7c3aed]/80" />

      {/* screen bezel */}
      <div className="absolute bottom-[76px] left-1/2 h-[160px] w-[260px] -translate-x-1/2 rounded-2xl border border-purple-300/30 bg-[#a78bfa] p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
        {/* inner screen */}
        <div className="h-full rounded-xl bg-[#1e0a3c] p-3 overflow-hidden">
          {/* browser bar */}
          <div className="flex items-center gap-1.5 mb-2">
            <div className="h-2 w-2 rounded-full bg-[#ff5f57]" />
            <div className="h-2 w-2 rounded-full bg-[#febc2e]" />
            <div className="h-2 w-2 rounded-full bg-[#28c840]" />
            <div className="ml-2 h-2 flex-1 rounded-full bg-white/10" />
          </div>
          {/* content area */}
          <div className="rounded-lg bg-white/5 p-2 space-y-2">
            <div className="h-2 w-3/4 rounded-full bg-[#ffd2e3]/70" />
            <div className="h-2 w-full rounded-full bg-[#8f8cff]/60" />
            <div className="h-2 w-2/3 rounded-full bg-[#53d0ff]/50" />
            <div className="flex gap-2 pt-1">
              <div className="h-10 w-10 rounded-full bg-[conic-gradient(#2f6bff_0_42%,#16c8a1_42%_66%,#ff8f71_66%_100%)] opacity-80" />
              <div className="h-10 w-10 rounded-full bg-[conic-gradient(#7b4cff_0_34%,#44c7ff_34%_72%,#ffd15a_72%_100%)] opacity-80" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 5 Social media logos orbiting the laptop ── */}

      {/* Instagram — left middle */}
      <SocialTile animClass="float-1" style={{ left: "0px", top: "130px" }} glowColor="rgba(225,48,108,0.55)">
        <InstagramLogo />
      </SocialTile>

      {/* Facebook — top left */}
      <SocialTile animClass="float-2" style={{ left: "60px", top: "50px" }} glowColor="rgba(24,119,242,0.55)">
        <FacebookLogo />
      </SocialTile>

      {/* LinkedIn — top right */}
      <SocialTile animClass="float-3" style={{ right: "55px", top: "50px" }} glowColor="rgba(10,102,194,0.55)">
        <LinkedInLogo />
      </SocialTile>

      {/* YouTube — right middle */}
      <SocialTile animClass="float-4" style={{ right: "0px", top: "148px" }} glowColor="rgba(255,0,0,0.5)">
        <YouTubeLogo />
      </SocialTile>

      {/* TikTok — bottom center */}
      <SocialTile animClass="float-5" style={{ left: "50%", transform: "translateX(-50%)", bottom: "30px" }} glowColor="rgba(105,201,208,0.5)">
        <TikTokLogo />
      </SocialTile>
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
    <main className="min-h-screen bg-[#f5f3ff] p-3 text-[#1e0a3c] sm:p-4">
      {/* ── Floating animation keyframes ── */}
      <style>{`
        @keyframes floatA {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-12px) rotate(2deg); }
          66% { transform: translateY(-6px) rotate(-1deg); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          40% { transform: translateY(-16px) rotate(-3deg); }
          70% { transform: translateY(-8px) rotate(2deg); }
        }
        @keyframes floatC {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(4deg); }
        }
        @keyframes floatD {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          45% { transform: translateY(-14px) rotate(-2deg); }
        }
        @keyframes floatE {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          30% { transform: translateY(-18px) rotate(3deg); }
          60% { transform: translateY(-9px) rotate(-2deg); }
        }
        @keyframes floatF {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-13px) rotate(-4deg); }
        }
        @keyframes floatG {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          35% { transform: translateY(-11px) rotate(2deg); }
          75% { transform: translateY(-5px) rotate(-3deg); }
        }
        @keyframes floatH {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          42% { transform: translateY(-15px) rotate(1deg); }
        }
        @keyframes floatI {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          55% { transform: translateY(-9px) rotate(-2deg); }
        }
        .float-1 { animation: floatA 4.2s ease-in-out infinite; }
        .float-2 { animation: floatB 3.8s ease-in-out infinite 0.5s; }
        .float-3 { animation: floatC 5.1s ease-in-out infinite 1.1s; }
        .float-4 { animation: floatD 4.6s ease-in-out infinite 0.3s; }
        .float-5 { animation: floatE 3.9s ease-in-out infinite 0.8s; }
        .float-6 { animation: floatF 4.4s ease-in-out infinite 1.4s; }
        .float-7 { animation: floatG 5.3s ease-in-out infinite 0.2s; }
        .float-8 { animation: floatH 4.0s ease-in-out infinite 1.7s; }
        .float-9 { animation: floatI 4.8s ease-in-out infinite 0.6s; }
      `}</style>

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

            </form>

          </>
          )}
          </div>
        </div>
      </section>
    </main>
  );
}
