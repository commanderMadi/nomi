"use client";

import { useState } from "react";
import { ScriptCombobox } from "@/components/script-combobox";
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

  async function deleteComponent(componentId: string) {
    setBusy(true);
    setError(null);
    const res = await api<undefined>(
      `/users/${userId}/name-components/${componentId}`,
      { method: "DELETE" },
    );
    if (res.status !== 204) {
      setError("Could not delete name component");
    } else {
      onChanged();
    }
    setBusy(false);
  }

  return (
    <Card title="Name components">
      <p className="mb-4 text-sm text-zinc-500">
        Add the individual parts of your name.
      </p>
      {components.length === 0 ? (
        <p className="mb-4 text-sm text-zinc-400">No components added.</p>
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
              <button
                type="button"
                disabled={busy}
                onClick={() => deleteComponent(c.id)}
                className="ml-1 text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                title="Delete component"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-12">
        <div className="sm:col-span-3">
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
        </div>
        <div className="sm:col-span-3">
          <Field label="Value">
            <input
              className={inputClass}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
          </Field>
        </div>
        <div className="sm:col-span-4">
          <Field label="Script (ISO 15924)">
            <ScriptCombobox value={script} onChange={setScript} />
          </Field>
        </div>
        <div className="flex items-end sm:col-span-2">
          <Button type="submit" disabled={busy} className="w-full">
            Add component
          </Button>
        </div>
      </form>
      <ErrorText message={error} />
    </Card>
  );
}
