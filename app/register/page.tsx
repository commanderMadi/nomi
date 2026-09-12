"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";
import { api, setSession } from "@/lib/client";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const registered = await api<{ error?: string }>("/users", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (registered.status !== 201) {
      setError(registered.body.error ?? "Registration failed");
      setBusy(false);
      return;
    }
    const login = await api<{
      token?: string;
      userId?: string;
      error?: string;
    }>("/sessions", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (login.status !== 201 || !login.body.token || !login.body.userId) {
      setError(login.body.error ?? "Login failed");
      setBusy(false);
      return;
    }
    setSession({ token: login.body.token, userId: login.body.userId });
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-zinc-900">
          Create your account
        </h1>
        <Field label="Email">
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Password (min 8 characters)">
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </Field>
        <Button type="submit" disabled={busy}>
          {busy ? "Creating..." : "Register"}
        </Button>
        <ErrorText message={error} />
        <p className="text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
