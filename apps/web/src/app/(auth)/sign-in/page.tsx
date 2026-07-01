"use client";

import { Button } from "@CMLP/ui/components/button";
import { Checkbox } from "@CMLP/ui/components/checkbox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@CMLP/ui/components/input-group";
import { Label } from "@CMLP/ui/components/label";
import { AlertTriangle, Eye, EyeOff, Loader2, Lock, ShieldCheck, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignInPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message ?? "Something went wrong. Please try again.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel — compact on mobile, full-height on desktop */}
      <div className="flex flex-col justify-between gap-10 bg-ink px-8 py-10 text-ink-foreground lg:min-h-svh lg:px-16 lg:py-14">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-brand font-serif text-sm font-bold text-brand-foreground">
            C&M
          </div>
          <div className="font-serif text-sm leading-tight font-semibold">
            <p>Chikamhi &</p>
            <p>Mareanadzo</p>
          </div>
        </div>

        <div className="hidden max-w-md lg:block">
          <div className="mb-6 h-px w-10 bg-brand" />
          <h1 className="font-serif text-3xl leading-tight font-semibold text-balance xl:text-4xl">
            The firm&apos;s documents, ordered and secure.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-brand-muted/80">
            Every deed, affidavit and agreement — filed by client and case, searchable in
            seconds, and backed by a complete audit trail.
          </p>
        </div>

        <p className="text-[11px] font-medium tracking-[3px] text-brand/80 uppercase">
          Attorneys · Conveyancers · Notaries Public
        </p>
      </div>

      {/* Sign-in form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-16">
        <form onSubmit={handleSubmit} className="w-full max-w-sm" noValidate>
          <h2 className="font-serif text-2xl font-semibold text-foreground">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your firm staff credentials to continue.
          </p>

          {error ? (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
            >
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}

          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <InputGroup>
                <InputGroupAddon>
                  <User />
                </InputGroupAddon>
                <InputGroupInput
                  id="username"
                  name="username"
                  autoComplete="username"
                  placeholder="e.g. r.mareanadzo"
                  disabled={isSubmitting}
                  required
                />
              </InputGroup>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <InputGroup>
                <InputGroupAddon>
                  <Lock />
                </InputGroupAddon>
                <InputGroupInput
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  required
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <label htmlFor="keep-signed-in" className="flex items-center gap-2 text-xs">
              <Checkbox id="keep-signed-in" name="keep-signed-in" defaultChecked />
              Keep me signed in
            </label>
            <a href="#" className="text-xs text-brand hover:underline">
              Forgot password?
            </a>
          </div>

          <Button type="submit" size="lg" className="mt-6 w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>

          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs font-medium text-brand hover:underline"
          >
            <ShieldCheck className="size-3.5" />
            Unlock with biometrics
          </button>

          <p className="mt-8 text-center text-[11px] text-muted-foreground">
            Access is restricted to firm staff.
            <br />
            Trouble signing in?{" "}
            <a href="#" className="underline underline-offset-2">
              Contact the practice administrator.
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
