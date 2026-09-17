import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

// hard-delete anonymized stubs past the 30-day retention window. run on a schedule
const RETENTION_DAYS = 30;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const { count } = await prisma.user.deleteMany({
    where: { anonymizedAt: { not: null, lt: cutoff } },
  });
  console.log(`Purged ${count} anonymized account(s) older than ${RETENTION_DAYS} days.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
