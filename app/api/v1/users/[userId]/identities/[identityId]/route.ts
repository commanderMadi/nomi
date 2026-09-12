import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { readJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { authenticateSelf } from "@/lib/self";

const identityIdSchema = z.uuid();

const patchBodySchema = z.object({
  isDefault: z.boolean(),
});

const identityInclude = {
  context: true,
  components: {
    orderBy: { position: "asc" as const },
    include: { nameComponent: true },
  },
} satisfies Prisma.IdentityInclude;

type IdentityWithComponents = Prisma.IdentityGetPayload<{
  include: typeof identityInclude;
}>;

function toResponse(identity: IdentityWithComponents) {
  return {
    id: identity.id,
    context: identity.context.name,
    label: identity.label,
    isDefault: identity.isDefault,
    components: identity.components.map((c) => ({
      id: c.nameComponent.id,
      type: c.nameComponent.type,
      value: c.nameComponent.value,
      script: c.nameComponent.script,
    })),
  };
}

// update an identity (e.g. set as default)
export async function PATCH(
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

  const parsedBody = patchBodySchema.safeParse(await readJson(request));
  if (!parsedBody.success) {
    return Response.json(
      { error: "Validation failed", details: parsedBody.error.issues },
      { status: 400 },
    );
  }

  const identity = await prisma.identity.findFirst({
    where: { id: parsedId.data, userId: auth.user.id },
  });
  if (!identity) {
    return Response.json({ error: "Identity not found" }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (parsedBody.data.isDefault) {
      await tx.identity.updateMany({
        where: { userId: auth.user.id },
        data: { isDefault: false },
      });
    }
    return tx.identity.update({
      where: { id: identity.id },
      data: { isDefault: parsedBody.data.isDefault },
      include: identityInclude,
    });
  });

  return Response.json(toResponse(updated));
}

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
