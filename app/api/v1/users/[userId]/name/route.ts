import { type NextRequest } from "next/server";
import { z } from "zod";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { authenticateRequester } from "@/lib/requester-auth";
import { resolveName } from "@/lib/resolve-name";

// a requester may resolve at most this many names per minute
const RESOLVE_LIMIT = 120;
const RESOLVE_WINDOW_MS = 60_000;

const querySchema = z.object({
  context: z
    .string()
    .min(1)
    .max(64)
    // lowercase slug: starts with a letter, then letters, underscores, or hyphens
    .regex(/^[a-z][a-z_-]*$/, "context must be a lowercase slug"),
});

const paramsSchema = z.object({ userId: z.uuid() });

// resolve a user's display name for a given context (requester-facing)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const requester = await authenticateRequester(request);
  if (!requester) {
    return Response.json(
      { error: "Missing or invalid API key" },
      { status: 401 },
    );
  }

  // throttle each requester independently, by id
  const limit = rateLimit(`resolve:${requester.id}`, RESOLVE_LIMIT, RESOLVE_WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit);

  const parsedParams = paramsSchema.safeParse(await params);
  const parsedQuery = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsedParams.success || !parsedQuery.success) {
    return Response.json(
      {
        error: "Validation failed",
        details: [
          ...(parsedParams.error?.issues ?? []),
          ...(parsedQuery.error?.issues ?? []),
        ],
      },
      { status: 400 },
    );
  }

  const { status, body } = await resolveName(
    requester,
    parsedParams.data.userId,
    parsedQuery.data.context,
  );
  return Response.json(body, { status });
}
