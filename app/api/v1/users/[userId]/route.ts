import { randomBytes } from "node:crypto";
import { AuditAction, AuditResult } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authenticateSelf } from "@/lib/self";

const RETENTION_DAYS = 30;

// anonymize the authenticated user's account: strip all PII but keep the stub
// row and its audit trail (with userId intact) for 30 retention days
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await authenticateSelf(request, params);
  if (!auth.ok) return auth.response;

  if (auth.user.anonymizedAt) {
    return Response.json(
      { error: "Account is already anonymized" },
      { status: 409 },
    );
  }

  const anonymizedAt = new Date();
  await prisma.$transaction(async (tx) => {
    // remove the PII records. audit rows are deliberately kept
    await tx.identity.deleteMany({ where: { userId: auth.user.id } });
    await tx.nameComponent.deleteMany({ where: { userId: auth.user.id } });
    await tx.permission.deleteMany({ where: { userId: auth.user.id } });
    await tx.session.deleteMany({ where: { userId: auth.user.id } });

    // null the email and burn the password so the stub can never be logged into
    await tx.user.update({
      where: { id: auth.user.id },
      data: {
        email: null,
        password: randomBytes(32).toString("hex"),
        anonymizedAt,
      },
    });

    await tx.auditLog.create({
      data: {
        action: AuditAction.ACCOUNT_ANONYMIZED,
        result: AuditResult.SUCCESS,
        userId: auth.user.id,
      },
    });
  });

  const purgeAfter = new Date(
    anonymizedAt.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  return Response.json({ anonymizedAt, purgeAfter, retentionDays: RETENTION_DAYS });
}
