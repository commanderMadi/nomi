import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticateSelf } from "@/lib/self";

const identityIdSchema = z.uuid();

// delete an identity belonging to the authenticated user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string; identityId: string }> },
) {
  const auth = await authenticateSelf(request, params);
  if (!auth.ok) return auth.response;

  const parsedId = identityIdSchema.safeParse((await params).identityId);
  if (!parsedId.success) {
    return Response.json(
      { error: "Validation failed", details: parsedId.error.issues },
      { status: 400 },
    );
  }

  const identity = await prisma.identity.findFirst({
    where: { id: parsedId.data, userId: auth.user.id },
  });
  if (!identity) {
    return Response.json({ error: "Identity not found" }, { status: 404 });
  }

  await prisma.identity.delete({
    where: { id: identity.id },
  });

  return new Response(null, { status: 204 });
}
