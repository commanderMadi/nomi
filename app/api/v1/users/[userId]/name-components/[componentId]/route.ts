import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticateSelf } from "@/lib/self";

const componentIdSchema = z.uuid();

// delete a name component belonging to the authenticated user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string; componentId: string }> },
) {
  const auth = await authenticateSelf(request, params);
  if (!auth.ok) return auth.response;

  const parsedId = componentIdSchema.safeParse((await params).componentId);
  if (!parsedId.success) {
    return Response.json(
      { error: "Validation failed", details: parsedId.error.issues },
      { status: 400 },
    );
  }

  const component = await prisma.nameComponent.findFirst({
    where: { id: parsedId.data, userId: auth.user.id },
  });
  if (!component) {
    return Response.json({ error: "Name component not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    // Delete the target name component
    await tx.nameComponent.delete({
      where: { id: component.id },
    });

    // Clean up any identities that have no remaining components left
    await tx.identity.deleteMany({
      where: {
        userId: auth.user.id,
        components: { none: {} },
      },
    });
  });

  return new Response(null, { status: 204 });
}
