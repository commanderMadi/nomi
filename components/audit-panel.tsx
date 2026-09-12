"use client";

import { Button, Card } from "@/components/ui";
import type { AuditRow } from "@/lib/client";

const RESULT_STYLES: Record<string, string> = {
  SUCCESS: "text-green-700",
  DENIED_NO_PERMISSION: "text-red-600",
  DENIED_REQUESTER_INACTIVE: "text-red-600",
  INVALID_CONTEXT: "text-amber-600",
  NOT_FOUND: "text-amber-600",
  ERROR: "text-red-600",
};

export function AuditPanel({
  rows,
  onRefresh,
}: {
  rows: AuditRow[];
  onRefresh: () => void;
}) {
  return (
    <Card title="Audit log">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          Log of resolution requests and permission updates.
        </p>
        <Button variant="secondary" onClick={onRefresh}>
          Refresh
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400">No activity recorded.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500">
              <th className="py-2 pr-4 font-medium">When</th>
              <th className="py-2 pr-4 font-medium">Action</th>
              <th className="py-2 pr-4 font-medium">Result</th>
              <th className="py-2 pr-4 font-medium">Organization</th>
              <th className="py-2 font-medium">Context</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100">
                <td className="py-2 pr-4 text-zinc-500">
                  {new Date(row.createdAt).toLocaleString()}
                </td>
                <td className="py-2 pr-4">{row.action}</td>
                <td
                  className={`py-2 pr-4 font-medium ${RESULT_STYLES[row.result] ?? ""}`}
                >
                  {row.result}
                </td>
                <td className="py-2 pr-4">{row.requester ?? "N/A"}</td>
                <td className="py-2">{row.context ?? "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
