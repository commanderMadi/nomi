import argon2 from "argon2";
import { z } from "zod";
import { readJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

// auth logic
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const password = await argon2.hash(parsed.data.password);
  try {
    const user = await prisma.user.create({
      data: { email: parsed.data.email, password },
      select: { id: true, email: true, createdAt: true },
    });
    return Response.json(user, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return Response.json(
        { error: "Email is already registered" },
        { status: 409 },
      );
    }
    throw error;
  }
}
