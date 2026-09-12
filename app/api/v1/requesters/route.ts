import { z } from "zod";
import { bearerToken } from "@/lib/bearer";
import { readJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { generateApiKey, hashToken } from "@/lib/tokens";

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["HOSPITAL", "UNIVERSITY", "EMPLOYER", "GOVERNMENT", "OTHER"]),
});

// list all active requesters (public, no auth required)
export async function GET() {
  const requesters = await prisma.requester.findMany({
    where: { isActive: true },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });
  return Response.json(requesters);
}

// register a new requester, admin-only via ADMIN_API_KEY
export async function POST(request: Request) {
  const adminKey = process.env.ADMIN_API_KEY;
  const key = bearerToken(request);
  if (!adminKey || key !== adminKey) {
    return Response.json(
      { error: "Missing or invalid admin key" },
      { status: 401 },
    );
  }

  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const apiKey = generateApiKey();
  const requester = await prisma.requester.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      apiKeyHash: hashToken(apiKey),
    },
    select: { id: true, name: true, type: true, createdAt: true },
  });

  // plain api key is only returned once here; we only store the hash
  return Response.json({ ...requester, apiKey }, { status: 201 });
}
