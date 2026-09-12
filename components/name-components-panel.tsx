"use client";

import { useState } from "react";
import { ScriptCombobox } from "@/components/script-combobox";
import { Badge, Button, Card, ErrorText, Field, Modal, inputClass } from "@/components/ui";
import { api, type Identity, type NameComponent } from "@/lib/client";

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
  identities = [],
  onChanged,
}: {
  userId: string;
  components: NameComponent[];
  identities?: Identity[];
  onChanged: () => void;
}) {
  const [type, setType] = useState("GIVEN");
  const [value, setValue] = useState("");
  const [script, setScript] = useState("Latn");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{
    component: NameComponent;
    affectedIdentities: Identity[];
  } | null>(null);

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

  function onRequestDelete(c: NameComponent) {
    const affected = identities.filter((identity) =>
      identity.components.some((comp) => comp.id === c.id),
    );

    if (affected.length > 0) {
      setConfirmDelete({ component: c, affectedIdentities: affected });
    } else {
      deleteComponent(c.id);
    }
  }

  return (
    <>
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
                  onClick={() => onRequestDelete(c)}
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

      <Modal
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete name component?"
      >
        {confirmDelete && (
          <div className="space-y-4 text-sm text-zinc-600">
            <p>
              The component <strong className="font-semibold text-zinc-900">{confirmDelete.component.value}</strong> is currently used in the following {confirmDelete.affectedIdentities.length} identity/identities:
            </p>
            <ul className="space-y-1 pl-3 text-xs">
              {confirmDelete.affectedIdentities.map((identity) => (
                <li key={identity.id} className="flex items-center gap-2 text-zinc-800">
                  <span className="font-medium">• {identity.label}</span>
                  <Badge>{identity.context}</Badge>
                </li>
              ))}
            </ul>
            <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-md border border-amber-200/80">
              Deleting this component will update your identities. Any identity left without any components will be automatically removed.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() => {
                  deleteComponent(confirmDelete.component.id);
                  setConfirmDelete(null);
                }}
              >
                Delete component
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
