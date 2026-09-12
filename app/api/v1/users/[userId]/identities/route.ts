import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { readJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { authenticateSelf } from "@/lib/self";

const bodySchema = z.object({
  context: z
    .string()
    .min(1)
    .max(64)
    // lowercase slug: starts with a letter, then letters, underscores, or hyphens
    .regex(/^[a-z][a-z_-]*$/, "context must be a lowercase slug"),
  label: z.string().min(1).max(120),
  isDefault: z.boolean().optional(),
  componentIds: z
    .array(z.uuid())
    .min(1)
    .max(32)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "componentIds must not contain duplicates",
    }),
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

// list all identities for the authenticated user, with their name components
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await authenticateSelf(request, params);
  if (!auth.ok) return auth.response;

  const identities = await prisma.identity.findMany({
    where: { userId: auth.user.id },
    include: identityInclude,
    orderBy: { createdAt: "asc" },
  });
  return Response.json(identities.map(toResponse));
}

// create an identity by linking existing name components under a context
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

  const owned = await prisma.nameComponent.findMany({
    where: { id: { in: parsed.data.componentIds }, userId: auth.user.id },
    select: { id: true },
  });
  if (owned.length !== parsed.data.componentIds.length) {
    return Response.json(
      { error: "One or more name components do not exist" },
      { status: 400 },
    );
  }

  try {
    const identity = await prisma.$transaction(async (tx) => {
      if (parsed.data.isDefault) {
        await tx.identity.updateMany({
          where: { userId: auth.user.id },
          data: { isDefault: false },
        });
      }
      return tx.identity.create({
        data: {
          userId: auth.user.id,
          contextId: context.id,
          label: parsed.data.label,
          isDefault: parsed.data.isDefault ?? false,
          components: {
            create: parsed.data.componentIds.map((nameComponentId, position) => ({
              nameComponentId,
              position,
            })),
          },
        },
        include: identityInclude,
      });
    });
    return Response.json(toResponse(identity), { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return Response.json(
        { error: "An identity already exists for this context" },
        { status: 409 },
      );
    }
    throw error;
  }
}
