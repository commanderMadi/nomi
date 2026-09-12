import { z } from "zod";
import { readJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { authenticateSelf } from "@/lib/self";

const bodySchema = z.object({
  type: z.enum([
    "GIVEN",
    "FAMILY",
    "PATRONYMIC",
    "MATRONYMIC",
    "NICKNAME",
    "HONORIFIC",
    "GENERATIONAL",
    "RELIGIOUS",
    "OTHER",
  ]),
  value: z.string().min(1).max(200),
  // ISO 15924 script codes are always one uppercase + three lowercase letters (e.g. Latn, Arab)
  script: z.string().regex(/^[A-Z][a-z]{3}$/, "script must be an ISO 15924 code"),
});

// list all name components for the authenticated user
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await authenticateSelf(request, params);
  if (!auth.ok) return auth.response;

  const components = await prisma.nameComponent.findMany({
    where: { userId: auth.user.id },
    select: { id: true, type: true, value: true, script: true },
  });
  return Response.json(components);
}

// create a new name component and return it
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

  const component = await prisma.nameComponent.create({
    data: { userId: auth.user.id, ...parsed.data },
    select: { id: true, type: true, value: true, script: true },
  });
  return Response.json(component, { status: 201 });
}
