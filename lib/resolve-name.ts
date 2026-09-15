import type { Requester } from "@/generated/prisma/client";
import { AuditAction, AuditResult } from "@/generated/prisma/client";
import { assembleDisplay } from "@/lib/assembly";
import { prisma } from "@/lib/prisma";

export type ResolutionOutcome =
  | { status: 200; body: ResolvedName }
  | { status: 400 | 403 | 404; body: { error: string } };

export interface ResolvedName {
  userId: string;
  context: string;
  name: {
    display: string;
    label: string;
    fallback: boolean;
    components: { type: string; value: string; script: string }[];
  };
}

export async function resolveName(
  requester: Requester,
  userId: string,
  contextName: string,
): Promise<ResolutionOutcome> {
  const audit = (
    result: AuditResult,
    extra: { contextId?: string; userId?: string; identityId?: string } = {},
  ) =>
    prisma.auditLog.create({
      data: {
        action: AuditAction.NAME_RESOLUTION,
        result,
        requesterId: requester.id,
        ...extra,
      },
    });

  if (!requester.isActive) {
    await audit(AuditResult.DENIED_REQUESTER_INACTIVE);
    return { status: 403, body: { error: "Requester is deactivated" } };
  }

  const context = await prisma.context.findUnique({
    where: { name: contextName },
  });
  if (!context) {
    await audit(AuditResult.INVALID_CONTEXT);
    return { status: 400, body: { error: `Unknown context: ${contextName}` } };
  }

  const [user, permission] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.permission.findUnique({
      where: {
        userId_requesterId_contextId: {
          userId,
          requesterId: requester.id,
          contextId: context.id,
        },
      },
    }),
  ]);
  if (!user || !permission || permission.revokedAt !== null) {
    await audit(user ? AuditResult.DENIED_NO_PERMISSION : AuditResult.NOT_FOUND, {
      contextId: context.id,
      userId: user?.id,
    });
    return { status: 403, body: { error: "Access denied" } };
  }

  const include = {
    components: {
      orderBy: { position: "asc" as const },
      include: { nameComponent: true },
    },
  };
  let fallback = false;
  let identity = await prisma.identity.findUnique({
    where: { userId_contextId: { userId: user.id, contextId: context.id } },
    include,
  });
  // no identity for this context, fall back to the user's default identity
  if (!identity) {
    fallback = true;
    identity = await prisma.identity.findFirst({
      where: { userId: user.id, isDefault: true },
      include,
    });
  }
  if (!identity || identity.components.length === 0) {
    await audit(AuditResult.NOT_FOUND, {
      contextId: context.id,
      userId: user.id,
    });
    return {
      status: 404,
      body: { error: "No identity available for this context" },
    };
  }

  // assembleDisplay applies the scriptio-continua separator law, 
  // so names such as 山田太郎 joins without spaces while mixed/Latin names keep them.
  const components = identity.components.map((c) => c.nameComponent);
  const display = assembleDisplay(components);

  await audit(AuditResult.SUCCESS, {
    contextId: context.id,
    userId: user.id,
    identityId: identity.id,
  });

  return {
    status: 200,
    body: {
      userId: user.id,
      context: context.name,
      name: {
        display,
        label: identity.label,
        fallback,
        components: components.map((c) => ({
          type: c.type,
          value: c.value,
          script: c.script,
        })),
      },
    },
  };
}
