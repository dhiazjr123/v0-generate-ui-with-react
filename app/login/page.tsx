// app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false); // visual only (lihat catatan)
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // kalau sudah login, redirect
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        router.replace(next);
        router.refresh();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace(next);
      router.refresh();
    } catch (e: any) {
      setErr(e.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  };

  return (
    <main className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Kiri: placeholder / gambar (persis seperti sebelumnya) */}
      <div className="hidden md:flex items-center justify-center bg-muted">
        <div className="w-[70%] aspect-[4/3] border-8 border-white/70 bg-gradient-to-br from-muted to-background rounded-lg flex items-center justify-center">
          <div className="w-[85%] h-[85%] border-4 border-white/70 rounded-md flex items-center justify-center">
            <div className="w-full h-1 border-t-2 border-white/60 rotate-45 -translate-y-2" />
            <div className="w-full h-1 border-t-2 border-white/60 -rotate-45 translate-y-2 -ml-16" />
          </div>
        </div>
      </div>

      {/* Kanan: form (layout sama) */}
      <div className="flex items-center justify-center bg-gradient-to-b from-background to-muted/40 p-8">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-semibold text-center mb-8">Log In</h1>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  aria-label="toggle password"
                >
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="accent-primary"
                  />
                  Remember me
                </label>

                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => alert("Forgot password (hubungkan ke supabase.auth.resetPasswordForEmail)")}
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            {err && (
              <div className="text-sm text-red-500 border border-red-500/30 bg-red-500/10 rounded-md px-3 py-2">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-foreground text-background py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Log In"}
            </button>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs text-muted-foreground">
              <div className="h-px bg-border" />
              <span>or</span>
              <div className="h-px bg-border" />
            </div>

            <button
              type="button"
              onClick={loginWithGoogle}
              className="w-full rounded-md border border-border bg-background py-2 text-sm hover:bg-muted/40"
            >
              <span className="inline-flex items-center gap-2">
                <Image src="/g.png" alt="Google" width={18} height={18} />
                Continue with Google
              </span>
            </button>
          </form>

          <p className="text-xs text-muted-foreground mt-6 text-center">
            No account yet?{" "}
            <a className="text-primary hover:underline" href={`/register?next=${encodeURIComponent(next)}`}>
              Sign Up
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
