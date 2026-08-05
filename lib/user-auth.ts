import type { User } from "@/generated/prisma/client";
import { bearerToken } from "@/lib/bearer";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

export async function authenticateUser(request: Request): Promise<User | null> {
  const token = bearerToken(request);
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;

  return session.user;
}
