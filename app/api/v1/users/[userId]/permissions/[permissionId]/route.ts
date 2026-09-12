import { z } from "zod";
import { AuditAction, AuditResult } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authenticateSelf } from "@/lib/self";

const permissionIdSchema = z.uuid();

// revoke a permission grant (soft delete, idempotent)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string; permissionId: string }> },
) {
  const auth = await authenticateSelf(request, params);
  if (!auth.ok) return auth.response;

  const parsedId = permissionIdSchema.safeParse((await params).permissionId);
  if (!parsedId.success) {
    return Response.json(
      { error: "Validation failed", details: parsedId.error.issues },
      { status: 400 },
    );
  }

  const permission = await prisma.permission.findFirst({
    where: { id: parsedId.data, userId: auth.user.id },
  });
  if (!permission) {
    return Response.json({ error: "Permission not found" }, { status: 404 });
  }

  // only revoke if not already revoked, keeps the operation idempotent
  if (permission.revokedAt === null) {
    await prisma.permission.update({
      where: { id: permission.id },
      data: { revokedAt: new Date() },
    });
    await prisma.auditLog.create({
      data: {
        action: AuditAction.PERMISSION_REVOKE,
        result: AuditResult.SUCCESS,
        userId: auth.user.id,
        requesterId: permission.requesterId,
        contextId: permission.contextId,
      },
    });
  }

  return new Response(null, { status: 204 });
}
