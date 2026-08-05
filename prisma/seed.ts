import "dotenv/config";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  ComponentType,
  PrismaClient,
  RequesterType,
} from "../generated/prisma/client";
import { hashToken } from "../lib/tokens";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const USERS = {
  ahmed: "00000000-0000-4000-8000-000000000001",
  yuki: "00000000-0000-4000-8000-000000000002",
  bjork: "00000000-0000-4000-8000-000000000003",
  joko: "00000000-0000-4000-8000-000000000004",
  maria: "00000000-0000-4000-8000-000000000005",
} as const;

const DEV_KEYS = {
  hospital: "nomi_dev_hospital",
  employer: "nomi_dev_employer",
  university: "nomi_dev_university",
  government: "nomi_dev_government",
  broker: "nomi_dev_broker",
} as const;

// Only for development and testing purposes. Do not use in production.
const DEV_PASSWORD = "dev-password-only";

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.identityNameComponent.deleteMany();
  await prisma.identity.deleteMany();
  await prisma.nameComponent.deleteMany();
  await prisma.session.deleteMany();
  await prisma.requester.deleteMany();
  await prisma.context.deleteMany();
  await prisma.user.deleteMany();

  const contexts = Object.fromEntries(
    // executes all database insertions concurrently in parallel. Prisma creates
    // the context from name + description
    await Promise.all(
      (
        [
          ["legal", "Official records: government and contracts"],
          ["medical", "Healthcare providers and patient records"],
          ["employment", "Employers, payroll, and workplace systems"],
          ["education", "Schools, universities, and certification bodies"],
          ["financial", "Banks, insurance, and payment services"],
          ["casual", "Informal and social settings"],
        ] as const
      ).map(async ([name, description]) => {
        const ctx = await prisma.context.create({
          data: { name, description },
        });
        return [name, ctx] as const;
      }),
    ),
  );

  // Hash the dev-testing password
  const password = await argon2.hash(DEV_PASSWORD);

  async function createPerson(opts: {
    id: string;
    email: string;
    components: Record<
      string,
      { type: ComponentType; value: string; script: string }
    >;
    identities: {
      context: string;
      label: string;
      isDefault?: boolean;
      parts: string[];
    }[];
  }) {
    await prisma.user.create({
      data: { id: opts.id, email: opts.email, password },
    });
    const componentIds: Record<string, string> = {};
    for (const [key, data] of Object.entries(opts.components)) {
      const c = await prisma.nameComponent.create({
        data: { userId: opts.id, ...data },
      });
      componentIds[key] = c.id;
    }
    for (const identity of opts.identities) {
      await prisma.identity.create({
        data: {
          userId: opts.id,
          contextId: contexts[identity.context].id,
          label: identity.label,
          isDefault: identity.isDefault ?? false,
          components: {
            create: identity.parts.map((part, position) => ({
              nameComponentId: componentIds[part],
              position,
            })),
          },
        },
      });
    }
  }

  await createPerson({
    id: USERS.ahmed,
    email: "ahmed@example.com",
    components: {
      given: { type: ComponentType.GIVEN, value: "Ahmed", script: "Latn" },
      father: { type: ComponentType.PATRONYMIC, value: "Magdy", script: "Latn" },
      grandfather: {
        type: ComponentType.PATRONYMIC,
        value: "Abdelnaby",
        script: "Latn",
      },
      greatGrandfather: {
        type: ComponentType.PATRONYMIC,
        value: "Mohamed",
        script: "Latn",
      },
      givenAr: { type: ComponentType.GIVEN, value: "أحمد", script: "Arab" },
      fatherAr: {
        type: ComponentType.PATRONYMIC,
        value: "مجدي",
        script: "Arab",
      },
      grandfatherAr: {
        type: ComponentType.PATRONYMIC,
        value: "عبد النبي",
        script: "Arab",
      },
      greatGrandfatherAr: {
        type: ComponentType.PATRONYMIC,
        value: "محمد",
        script: "Arab",
      },
    },
    identities: [
      {
        context: "legal",
        label: "Legal (Latin)",
        parts: ["given", "father", "grandfather", "greatGrandfather"],
      },
      {
        context: "medical",
        label: "Medical (Arabic)",
        parts: ["givenAr", "fatherAr", "grandfatherAr", "greatGrandfatherAr"],
      },
      {
        context: "employment",
        label: "Professional",
        parts: ["given", "father"],
      },
      {
        context: "casual",
        label: "Casual",
        isDefault: true, // acts as the fallback
        parts: ["given"],
      },
    ],
  });

  await createPerson({
    id: USERS.yuki,
    email: "yuki@example.com",
    components: {
      family: { type: ComponentType.FAMILY, value: "田中", script: "Jpan" },
      given: { type: ComponentType.GIVEN, value: "雪", script: "Jpan" },
      familyRomaji: {
        type: ComponentType.FAMILY,
        value: "Tanaka",
        script: "Latn",
      },
      givenRomaji: { type: ComponentType.GIVEN, value: "Yuki", script: "Latn" },
    },
    identities: [
      {
        context: "legal",
        label: "Legal (kanji, family first)",
        parts: ["family", "given"],
      },
      {
        context: "employment",
        label: "International (romaji, given first)",
        parts: ["givenRomaji", "familyRomaji"],
      },
      {
        context: "casual",
        label: "Casual",
        isDefault: true,
        parts: ["givenRomaji"],
      },
    ],
  });

  await createPerson({
    id: USERS.bjork,
    email: "bjork@example.com",
    components: {
      given: { type: ComponentType.GIVEN, value: "Björk", script: "Latn" },
      patronymic: {
        type: ComponentType.PATRONYMIC,
        value: "Guðmundsdóttir",
        script: "Latn",
      },
    },
    identities: [
      { context: "legal", label: "Legal", parts: ["given", "patronymic"] },
      { context: "casual", label: "Casual", isDefault: true, parts: ["given"] },
    ],
  });

  await createPerson({
    id: USERS.joko,
    email: "joko@example.com",
    components: {
      given: { type: ComponentType.GIVEN, value: "Joko", script: "Latn" },
    },
    identities: [
      {
        context: "legal",
        label: "Legal (mononym)",
        isDefault: true,
        parts: ["given"],
      },
    ],
  });

  await createPerson({
    id: USERS.maria,
    email: "maria@example.com",
    components: {
      given: { type: ComponentType.GIVEN, value: "María", script: "Latn" },
      paternal: {
        type: ComponentType.FAMILY,
        value: "García",
        script: "Latn",
      },
      maternal: { type: ComponentType.FAMILY, value: "López", script: "Latn" },
    },
    identities: [
      {
        context: "legal",
        label: "Legal (both surnames)",
        parts: ["given", "paternal", "maternal"],
      },
      {
        context: "medical",
        label: "Medical",
        parts: ["given", "paternal", "maternal"],
      },
      { context: "casual", label: "Casual", isDefault: true, parts: ["given"] },
    ],
  });

  const requesters = Object.fromEntries(
    await Promise.all(
      (
        [
          ["hospital", "Cairo General Hospital", RequesterType.HOSPITAL],
          ["employer", "Tokyo Tech KK", RequesterType.EMPLOYER],
          ["university", "University of London", RequesterType.UNIVERSITY],
          ["government", "Civil Registry Office", RequesterType.GOVERNMENT],
          ["broker", "Acme Data Broker", RequesterType.OTHER],
        ] as const
      ).map(async ([key, name, type]) => {
        const r = await prisma.requester.create({
          data: { name, type, apiKeyHash: hashToken(DEV_KEYS[key]) },
        });
        return [key, r] as const;
      }),
    ),
  );

  const grants: [string, string, string][] = [
    ["hospital", USERS.ahmed, "medical"],
    ["hospital", USERS.maria, "medical"],
    ["employer", USERS.ahmed, "employment"],
    ["employer", USERS.yuki, "employment"],
    ["university", USERS.ahmed, "education"],
    ["government", USERS.ahmed, "legal"],
    ["government", USERS.bjork, "legal"],
    ["government", USERS.joko, "legal"],
  ];
  for (const [requester, userId, context] of grants) {
    await prisma.permission.create({
      data: {
        userId,
        requesterId: requesters[requester].id,
        contextId: contexts[context].id,
      },
    });
  }
  await prisma.permission.create({
    data: {
      userId: USERS.yuki,
      requesterId: requesters.hospital.id,
      contextId: contexts.medical.id,
      revokedAt: new Date(),
    },
  });

  console.log("Seeded. Fixed user ids:");
  console.table(USERS);
  console.log(`Seed user password: ${DEV_PASSWORD}`);
  console.log("Dev API keys (Authorization: Bearer <key>):");
  console.table(DEV_KEYS);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
