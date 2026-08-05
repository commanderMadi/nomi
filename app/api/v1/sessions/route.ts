import argon2 from "argon2";
import { z } from "zod";
import { readJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { generateSessionToken, hashToken } from "@/lib/tokens";

// Standard session time to live in milliseconds (30 days)
// https://www.obsidiansecurity.com/blog/refresh-token-security-best-practices
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const bodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

// computed once at startup to avoid expensive rehashing per invalid request
const dummyHash = argon2.hash("nomi.dummy.password.value");

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  // fallback to dummy hash if user doesn't exist so both paths take ~60ms
  // prevents email enumeration via timing leaks
  const hash = user?.password ?? (await dummyHash);
  const valid = await argon2.verify(hash, parsed.data.password);
  if (!user || !valid) {
    return Response.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }

  const token = generateSessionToken();
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });

  return Response.json(
    { token, userId: user.id, expiresAt: session.expiresAt },
    { status: 201 },
  );
}
