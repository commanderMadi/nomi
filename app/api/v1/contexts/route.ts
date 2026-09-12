import { prisma } from "@/lib/prisma";

export async function GET() {
  const contexts = await prisma.context.findMany({
    select: { name: true, description: true },
    orderBy: { name: "asc" },
  });
  return Response.json(contexts);
}
