"use client";

import { useState } from "react";
import { Button, Card, ErrorText, Modal } from "@/components/ui";
import { api, clearSession } from "@/lib/client";

export function DeleteAccount({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    const res = await api(`/users/${userId}`, { method: "DELETE" });
    if (res.status !== 200) {
      setError("Could not delete the account. Please try again.");
      setBusy(false);
      return;
    }
    // account is now an anonymized stub; drop the local session and leave
    clearSession();
    window.location.href = "/";
  }

  return (
    <Card title="Delete account">
      <p className="text-sm text-zinc-600">
        Anonymize and remove your account. This cannot be undone.
      </p>
      <div className="mt-3">
        <Button variant="danger" onClick={() => setIsOpen(true)}>
          Delete my account
        </Button>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => !busy && setIsOpen(false)}
        title="Delete your account?"
      >
        <p className="text-sm text-zinc-600">
          Your name components, identities, access grants, and login are removed
          immediately and permanently.
        </p>
        <p className="mt-3 text-sm text-zinc-600">
          A stub record keyed only by your user ID is kept for{" "}
          <span className="font-medium text-zinc-800">30 days</span> so recent
          access history stays accountable. It holds no personal information, and
          is permanently deleted after that.
        </p>
        <p className="mt-3 text-sm text-zinc-600">
          This cannot be undone, and you will be logged out.
        </p>
        <ErrorText message={error} />
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setIsOpen(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={busy}>
            {busy ? "Deleting..." : "Delete permanently"}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
