import { z } from "zod";
import type { User } from "@/generated/prisma/client";
import { authenticateUser } from "@/lib/user-auth";

const paramsSchema = z.object({ userId: z.uuid() });

type SelfAuth = { ok: true; user: User } | { ok: false; response: Response };

// helper guard for /users/[userId] routes to enforce session authentication and user ownership
export async function authenticateSelf(
  request: Request,
  params: Promise<{ userId: string }>,
): Promise<SelfAuth> {
  // verify bearer token session
  const user = await authenticateUser(request);
  if (!user) {
    return {
      ok: false,
      response: Response.json(
        { error: "Missing or invalid session token" },
        { status: 401 },
      ),
    };
  }

  // validate userId URL parameter format
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) {
    return {
      ok: false,
      response: Response.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      ),
    };
  }

  // ensure session user matches requested route userId (prevents IDOR)
  if (parsed.data.userId !== user.id) {
    return {
      ok: false,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, user };
}
