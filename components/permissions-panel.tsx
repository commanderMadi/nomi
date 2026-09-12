"use client";

import { useState } from "react";
import { Badge, Button, Card, ErrorText, Field, inputClass } from "@/components/ui";
import {
  api,
  type ContextInfo,
  type Permission,
  type RequesterInfo,
} from "@/lib/client";

export function PermissionsPanel({
  userId,
  permissions,
  requesters,
  contexts,
  onChanged,
}: {
  userId: string;
  permissions: Permission[];
  requesters: RequesterInfo[];
  contexts: ContextInfo[];
  onChanged: () => void;
}) {
  const [requesterId, setRequesterId] = useState("");
  const [context, setContext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function grant(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api<{ error?: string }>(`/users/${userId}/permissions`, {
      method: "POST",
      body: JSON.stringify({ requesterId, context }),
    });
    if (res.status !== 201) {
      setError(res.body.error ?? "Could not grant access");
    } else {
      setRequesterId("");
      setContext("");
      onChanged();
    }
    setBusy(false);
  }

  async function revoke(permissionId: string) {
    setBusy(true);
    setError(null);
    const res = await api<{ error?: string } | undefined>(
      `/users/${userId}/permissions/${permissionId}`,
      { method: "DELETE" },
    );
    if (res.status !== 204) {
      setError(res.body?.error ?? "Could not revoke access");
    } else {
      onChanged();
    }
    setBusy(false);
  }

  return (
    <Card title="Access grants">
      <p className="mb-4 text-sm text-zinc-500">
        Manage organization access to your name contexts.
      </p>
      {permissions.length === 0 ? (
        <p className="mb-4 text-sm text-zinc-400">No active grants.</p>
      ) : (
        <table className="mb-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500">
              <th className="py-2 pr-4 font-medium">Organization</th>
              <th className="py-2 pr-4 font-medium">Context</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((p) => (
              <tr key={p.id} className="border-b border-zinc-100">
                <td className="py-2 pr-4">
                  {p.requester.name}{" "}
                  <Badge>{p.requester.type}</Badge>
                </td>
                <td className="py-2 pr-4">{p.context}</td>
                <td className="py-2 pr-4">
                  {p.revokedAt ? (
                    <span className="text-red-600">revoked</span>
                  ) : (
                    <span className="text-green-700">active</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  {!p.revokedAt && (
                    <Button
                      variant="danger"
                      disabled={busy}
                      onClick={() => revoke(p.id)}
                    >
                      Revoke
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form onSubmit={grant} className="grid gap-3 sm:grid-cols-3">
        <Field label="Organization">
          <select
            className={inputClass}
            value={requesterId}
            onChange={(e) => setRequesterId(e.target.value)}
            required
          >
            <option value="" disabled>
              Choose an organization
            </option>
            {requesters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.type})
              </option>
            ))}
          </select>
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
        <div className="flex items-end">
          <Button type="submit" disabled={busy}>
            Grant access
          </Button>
        </div>
      </form>
      <ErrorText message={error} />
    </Card>
  );
}
