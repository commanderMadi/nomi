"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AuditPanel } from "@/components/audit-panel";
import { IdentitiesPanel } from "@/components/identities-panel";
import { NameComponentsPanel } from "@/components/name-components-panel";
import { PermissionsPanel } from "@/components/permissions-panel";
import { Button } from "@/components/ui";
import {
  api,
  clearSession,
  getSession,
  type AuditRow,
  type ContextInfo,
  type Identity,
  type NameComponent,
  type Permission,
  type RequesterInfo,
  type Session,
} from "@/lib/client";

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSessionState] = useState<Session | null>(null);
  const [components, setComponents] = useState<NameComponent[]>([]);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [contexts, setContexts] = useState<ContextInfo[]>([]);
  const [requesters, setRequesters] = useState<RequesterInfo[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async (userId: string) => {
    const [comp, ident, perm, aud, ctx, req] = await Promise.all([
      api<NameComponent[]>(`/users/${userId}/name-components`),
      api<Identity[]>(`/users/${userId}/identities`),
      api<Permission[]>(`/users/${userId}/permissions`),
      api<AuditRow[]>(`/users/${userId}/audit`),
      api<ContextInfo[]>("/contexts"),
      api<RequesterInfo[]>("/requesters"),
    ]);
    if (comp.status === 401) {
      clearSession();
      window.location.href = "/login";
      return;
    }
    setComponents(comp.body);
    setIdentities(ident.body);
    setPermissions(perm.body);
    setAudit(aud.body);
    setContexts(ctx.body);
    setRequesters(req.body);
    setLoaded(true);
  }, []);

  useEffect(() => {
    const current = getSession();
    if (!current) {
      router.replace("/login");
      return;
    }
    setSessionState(current);
    refresh(current.userId);
  }, [router, refresh]);

  if (!session || !loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-zinc-400">Loading...</p>
      </main>
    );
  }

  const reload = () => refresh(session.userId);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900">Nomi</h1>
          <Button
            variant="secondary"
            onClick={() => {
              clearSession();
              router.push("/login");
            }}
          >
            Log out
          </Button>
        </header>
        <NameComponentsPanel
          userId={session.userId}
          components={components}
          onChanged={reload}
        />
        <IdentitiesPanel
          userId={session.userId}
          components={components}
          identities={identities}
          contexts={contexts}
          onChanged={reload}
        />
        <PermissionsPanel
          userId={session.userId}
          permissions={permissions}
          requesters={requesters}
          contexts={contexts}
          onChanged={reload}
        />
        <AuditPanel rows={audit} onRefresh={reload} />
      </div>
    </main>
  );
}
