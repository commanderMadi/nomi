import { z } from "zod";
import { AuditAction, AuditResult } from "@/generated/prisma/client";
import { readJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { authenticateSelf } from "@/lib/self";

const bodySchema = z.object({
  requesterId: z.uuid(),
  context: z
    .string()
    .min(1)
    .max(64)
    // lowercase slug: starts with a letter, then letters, underscores, or hyphens
    .regex(/^[a-z][a-z_-]*$/, "context must be a lowercase slug"),
});

// list all permissions (granted and revoked) for the authenticated user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await authenticateSelf(request, params);
  if (!auth.ok) return auth.response;

  const permissions = await prisma.permission.findMany({
    where: { userId: auth.user.id },
    include: {
      requester: { select: { id: true, name: true, type: true } },
      context: { select: { name: true } },
    },
    orderBy: { grantedAt: "desc" },
  });
  return Response.json(
    permissions.map((p) => ({
      id: p.id,
      requester: p.requester,
      context: p.context.name,
      grantedAt: p.grantedAt,
      revokedAt: p.revokedAt,
    })),
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await authenticateSelf(request, params);
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const context = await prisma.context.findUnique({
    where: { name: parsed.data.context },
  });
  if (!context) {
    return Response.json(
      { error: `Unknown context: ${parsed.data.context}` },
      { status: 400 },
    );
  }

  const requester = await prisma.requester.findUnique({
    where: { id: parsed.data.requesterId },
    select: { id: true, name: true, type: true },
  });
  if (!requester) {
    return Response.json({ error: "Unknown requester" }, { status: 400 });
  }

  // upsert so re-granting a previously revoked permission reactivates it
  const permission = await prisma.permission.upsert({
    where: {
      userId_requesterId_contextId: {
        userId: auth.user.id,
        requesterId: requester.id,
        contextId: context.id,
      },
    },
    create: {
      userId: auth.user.id,
      requesterId: requester.id,
      contextId: context.id,
    },
    update: { revokedAt: null, grantedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.PERMISSION_GRANT,
      result: AuditResult.SUCCESS,
      userId: auth.user.id,
      requesterId: requester.id,
      contextId: context.id,
    },
  });

  return Response.json(
    {
      id: permission.id,
      requester,
      context: context.name,
      grantedAt: permission.grantedAt,
      revokedAt: permission.revokedAt,
    },
    { status: 201 },
  );
}
