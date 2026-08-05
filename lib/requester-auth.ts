import type { Requester } from "@/generated/prisma/client";
import { bearerToken } from "@/lib/bearer";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

export async function authenticateRequester(
  request: Request,
): Promise<Requester | null> {
  const key = bearerToken(request);
  if (!key) return null;

  return prisma.requester.findUnique({
    where: { apiKeyHash: hashToken(key) },
  });
}
