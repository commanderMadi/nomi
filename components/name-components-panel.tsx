"use client";

import { useState } from "react";
import { Badge, Button, Card, ErrorText, Field, inputClass } from "@/components/ui";
import { api, type NameComponent } from "@/lib/client";

const COMPONENT_TYPES = [
  "GIVEN",
  "FAMILY",
  "PATRONYMIC",
  "MATRONYMIC",
  "NICKNAME",
  "HONORIFIC",
  "GENERATIONAL",
  "RELIGIOUS",
  "OTHER",
];

export function NameComponentsPanel({
  userId,
  components,
  onChanged,
}: {
  userId: string;
  components: NameComponent[];
  onChanged: () => void;
}) {
  const [type, setType] = useState("GIVEN");
  const [value, setValue] = useState("");
  const [script, setScript] = useState("Latn");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api<{ error?: string }>(
      `/users/${userId}/name-components`,
      { method: "POST", body: JSON.stringify({ type, value, script }) },
    );
    if (res.status !== 201) {
      setError(res.body.error ?? "Could not add component");
    } else {
      setValue("");
      onChanged();
    }
    setBusy(false);
  }

  return (
    <Card title="Name components">
      <p className="mb-4 text-sm text-zinc-500">
        Each component is one piece of your name, tagged with its type and
        script. Components are the building blocks of your identities.
      </p>
      {components.length === 0 ? (
        <p className="mb-4 text-sm text-zinc-400">No components yet.</p>
      ) : (
        <ul className="mb-4 flex flex-wrap gap-2">
          {components.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-1.5"
            >
              <span className="text-sm font-medium text-zinc-800">
                {c.value}
              </span>
              <Badge>{c.type}</Badge>
              <Badge>{c.script}</Badge>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4">
        <Field label="Type">
          <select
            className={inputClass}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {COMPONENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Value">
          <input
            className={inputClass}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
        </Field>
        <Field label="Script (ISO 15924)">
          <input
            className={inputClass}
            value={script}
            onChange={(e) => setScript(e.target.value)}
            pattern="[A-Z][a-z]{3}"
            required
          />
        </Field>
        <div className="flex items-end">
          <Button type="submit" disabled={busy}>
            Add component
          </Button>
        </div>
      </form>
      <ErrorText message={error} />
    </Card>
  );
}
