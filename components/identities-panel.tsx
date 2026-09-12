"use client";

import { useState } from "react";
import { Badge, Button, Card, ErrorText, Field, inputClass } from "@/components/ui";
import {
  api,
  displayName,
  type ContextInfo,
  type Identity,
  type NameComponent,
} from "@/lib/client";

export function IdentitiesPanel({
  userId,
  components,
  identities,
  contexts,
  onChanged,
}: {
  userId: string;
  components: NameComponent[];
  identities: Identity[];
  contexts: ContextInfo[];
  onChanged: () => void;
}) {
  const [context, setContext] = useState("");
  const [label, setLabel] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const byId = new Map(components.map((c) => [c.id, c]));
  const available = components.filter((c) => !selected.includes(c.id));
  const chosen = selected
    .map((id) => byId.get(id))
    .filter((c): c is NameComponent => c !== undefined);

  function move(index: number, delta: number) {
    const next = [...selected];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSelected(next);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api<{ error?: string }>(`/users/${userId}/identities`, {
      method: "POST",
      body: JSON.stringify({
        context,
        label,
        isDefault,
        componentIds: selected,
      }),
    });
    if (res.status !== 201) {
      setError(res.body.error ?? "Could not create identity");
    } else {
      setContext("");
      setLabel("");
      setIsDefault(false);
      setSelected([]);
      onChanged();
    }
    setBusy(false);
  }

  async function setDefaultIdentity(identityId: string) {
    setBusy(true);
    setError(null);
    const res = await api<{ error?: string }>(
      `/users/${userId}/identities/${identityId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ isDefault: true }),
      },
    );
    if (res.status !== 200) {
      setError(res.body.error ?? "Could not update default identity");
    } else {
      onChanged();
    }
    setBusy(false);
  }

  async function deleteIdentity(identityId: string) {
    setBusy(true);
    setError(null);
    const res = await api<undefined>(`/users/${userId}/identities/${identityId}`, {
      method: "DELETE",
    });
    if (res.status !== 204) {
      setError("Could not delete identity");
    } else {
      onChanged();
    }
    setBusy(false);
  }

  return (
    <Card title="Identities">
      <p className="mb-4 text-sm text-zinc-500">
        Combine and order name components for each context.
      </p>
      {identities.length === 0 ? (
        <p className="mb-4 text-sm text-zinc-400">No identities created.</p>
      ) : (
        <ul className="mb-6 space-y-2">
          {identities.map((identity) => (
            <li
              key={identity.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 transition-colors ${
                identity.isDefault
                  ? "border border-amber-300/80 bg-amber-50/60 shadow-xs"
                  : "border border-zinc-200 bg-white"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-zinc-900">
                  {displayName(identity.components)}
                </span>
                <Badge>{identity.context}</Badge>
                <span className="text-sm text-zinc-500">{identity.label}</span>
                {identity.isDefault && (
                  <Badge className="border border-amber-300/70 bg-amber-100 text-amber-900 font-semibold">
                    default
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!identity.isDefault && (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setDefaultIdentity(identity.id)}
                    className="border-amber-300/80 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:border-amber-400"
                  >
                    Set as default
                  </Button>
                )}
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => deleteIdentity(identity.id)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Context">
            <select
              className={inputClass}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              required
            >
              <option value="" disabled>
                Select context
              </option>
              {contexts.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Label">
            <input
              className={inputClass}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
          </Field>
          <label className="flex items-end gap-2 pb-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            Set as default
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-600">
              Available components
            </p>
            <ul className="flex flex-wrap gap-2">
              {available.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelected([...selected, c.id])}
                    className="rounded-md border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-100"
                  >
                    {c.value} <span className="text-zinc-400">{c.script}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-600">
              Name component order
            </p>
            {chosen.length === 0 ? (
              <p className="text-sm text-zinc-400">No components selected.</p>
            ) : (
              <ol className="space-y-1">
                {chosen.map((c, index) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm">
                    <span className="w-5 text-zinc-400">{index + 1}.</span>
                    <span className="font-medium">{c.value}</span>
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      className="text-zinc-400 hover:text-zinc-700"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      className="text-zinc-400 hover:text-zinc-700"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSelected(selected.filter((id) => id !== c.id))
                      }
                      className="text-red-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ol>
            )}
            {chosen.length > 0 && (
              <p className="mt-2 text-sm text-zinc-500">
                Preview:{" "}
                <span className="font-semibold text-zinc-800">
                  {displayName(chosen)}
                </span>
              </p>
            )}
          </div>
        </div>
        <Button type="submit" disabled={busy || selected.length === 0}>
          Create identity
        </Button>
        <ErrorText message={error} />
      </form>
    </Card>
  );
}
