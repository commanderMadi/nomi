import { prisma } from "@/lib/prisma";
import { authenticateSelf } from "@/lib/self";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await authenticateSelf(request, params);
  if (!auth.ok) return auth.response;

  const rows = await prisma.auditLog.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      requester: { select: { name: true, type: true } },
      context: { select: { name: true } },
    },
  });

  return Response.json(
    rows.map((row) => ({
      id: row.id,
      action: row.action,
      result: row.result,
      requester: row.requester?.name ?? null,
      requesterType: row.requester?.type ?? null,
      context: row.context?.name ?? null,
      createdAt: row.createdAt,
    })),
  );
}
