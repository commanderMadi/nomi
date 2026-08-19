"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Card, Field, inputClass } from "@/components/ui";
import type { ContextInfo } from "@/lib/client";

export default function ResolvePage() {
  const [apiKey, setApiKey] = useState("");
  const [userId, setUserId] = useState("");
  const [context, setContext] = useState("");
  const [contexts, setContexts] = useState<ContextInfo[]>([]);
  const [status, setStatus] = useState<number | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/v1/contexts")
      .then((res) => res.json())
      .then(setContexts)
      .catch(() => setContexts([]));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const res = await fetch(
      `/api/v1/users/${encodeURIComponent(userId)}/name?context=${encodeURIComponent(context)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    setStatus(res.status);
    setResponse(JSON.stringify(await res.json(), null, 2));
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900">
            Requester playground
          </h1>
          <Link href="/" className="text-sm text-zinc-500 underline">
            Home
          </Link>
        </header>
        <Card title="Resolve a name">
          <p className="mb-4 text-sm text-zinc-500">
            This is what an organization sees. Present an API key, a user id,
            and a context; the response depends entirely on what that user has
            granted to that key.
          </p>
          <form onSubmit={submit} className="space-y-3">
            <Field label="API key">
              <input
                className={inputClass}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
              />
            </Field>
            <Field label="User id">
              <input
                className={inputClass}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
              />
            </Field>
            <Field label="Context">
              <select
                className={inputClass}
                value={context}
                onChange={(e) => setContext(e.target.value)}
                required
              >
                <option value="" disabled>
                  Choose a context
                </option>
                {contexts.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="submit" disabled={busy}>
              Resolve
            </Button>
          </form>
        </Card>
        {response !== null && (
          <Card title={`Response (${status})`}>
            <pre className="overflow-x-auto rounded-md bg-zinc-900 p-4 text-sm text-zinc-100">
              {response}
            </pre>
          </Card>
        )}
      </div>
    </main>
  );
}
