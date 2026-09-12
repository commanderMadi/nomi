import "dotenv/config";
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_KEY = process.env.ADMIN_API_KEY ?? "";

const USERS = {
  ahmed: "00000000-0000-4000-8000-000000000001",
  yuki: "00000000-0000-4000-8000-000000000002",
  bjork: "00000000-0000-4000-8000-000000000003",
  joko: "00000000-0000-4000-8000-000000000004",
  maria: "00000000-0000-4000-8000-000000000005",
  unknown: "00000000-0000-4000-8000-0000000000ff",
} as const;

const KEYS = {
  hospital: "nomi_dev_hospital",
  employer: "nomi_dev_employer",
  university: "nomi_dev_university",
  government: "nomi_dev_government",
  broker: "nomi_dev_broker",
} as const;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

type Json = Record<string, unknown>;

// helper to call the api and parse the response as json
async function request(
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {},
): Promise<{ status: number; body: Json }> {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const body = res.status === 204 ? {} : ((await res.json()) as Json);
  return { status: res.status, body };
}

function resolve(key: string, userId: string, context: string) {
  return request("GET", `/api/v1/users/${userId}/name?context=${context}`, {
    token: key,
  });
}

function displayOf(body: Json): string {
  return (body.name as { display: string }).display;
}

function fallbackOf(body: Json): boolean {
  return (body.name as { fallback: boolean }).fallback;
}

// verifies name resolution against seeded demo data (requires seed script to have run)
describe("resolution matrix", () => {
  it("returns the full legal chain to government", async () => {
    const res = await resolve(KEYS.government, USERS.ahmed, "legal");
    assert.equal(res.status, 200);
    assert.equal(displayOf(res.body), "Ahmed Magdy Abdelnaby Mohamed");
  });

  it("returns the Arabic medical form to the hospital", async () => {
    const res = await resolve(KEYS.hospital, USERS.ahmed, "medical");
    assert.equal(res.status, 200);
    assert.equal(displayOf(res.body), "أحمد مجدي عبد النبي محمد");
  });

  it("returns two of four components to the employer", async () => {
    const res = await resolve(KEYS.employer, USERS.ahmed, "employment");
    assert.equal(res.status, 200);
    assert.equal(displayOf(res.body), "Ahmed Magdy");
    assert.equal(
      (res.body.name as { components: unknown[] }).components.length,
      2,
    );
  });

  it("reverses order for the romaji employment form", async () => {
    const res = await resolve(KEYS.employer, USERS.yuki, "employment");
    assert.equal(res.status, 200);
    assert.equal(displayOf(res.body), "Yuki Tanaka");
  });

  it("serves the Icelandic patronymic", async () => {
    const res = await resolve(KEYS.government, USERS.bjork, "legal");
    assert.equal(res.status, 200);
    assert.equal(displayOf(res.body), "Björk Guðmundsdóttir");
  });

  it("serves the Indonesian mononym as one component", async () => {
    const res = await resolve(KEYS.government, USERS.joko, "legal");
    assert.equal(res.status, 200);
    assert.equal(displayOf(res.body), "Joko");
    assert.equal(
      (res.body.name as { components: unknown[] }).components.length,
      1,
    );
  });

  it("serves the Spanish double surname", async () => {
    const res = await resolve(KEYS.hospital, USERS.maria, "medical");
    assert.equal(res.status, 200);
    assert.equal(displayOf(res.body), "María García López");
  });

  it("falls back to the default identity for an unconfigured context", async () => {
    const res = await resolve(KEYS.university, USERS.ahmed, "education");
    assert.equal(res.status, 200);
    assert.equal(fallbackOf(res.body), true);
    assert.equal(displayOf(res.body), "Ahmed");
  });

  it("denies a requester with no grant", async () => {
    const res = await resolve(KEYS.broker, USERS.ahmed, "medical");
    assert.equal(res.status, 403);
  });

  it("denies a revoked grant", async () => {
    const res = await resolve(KEYS.hospital, USERS.yuki, "medical");
    assert.equal(res.status, 403);
  });

  // both paths should return identical responses to prevent user enumeration
  it("returns identical denials for unknown user and missing permission", async () => {
    const noPermission = await resolve(KEYS.hospital, USERS.yuki, "medical");
    const unknownUser = await resolve(KEYS.hospital, USERS.unknown, "medical");
    assert.equal(unknownUser.status, noPermission.status);
    assert.deepEqual(unknownUser.body, noPermission.body);
  });
});

// tests the requester auth edge cases (missing key, wrong key, bad input)
describe("requester authentication and validation", () => {
  it("rejects a missing API key", async () => {
    const res = await request(
      "GET",
      `/api/v1/users/${USERS.ahmed}/name?context=medical`,
    );
    assert.equal(res.status, 401);
  });

  it("rejects an unknown API key", async () => {
    const res = await resolve("nomi_wrong_key", USERS.ahmed, "medical");
    assert.equal(res.status, 401);
  });

  it("rejects and audits an unknown context", async () => {
    const before = await prisma.auditLog.count({
      where: { result: "INVALID_CONTEXT" },
    });
    const res = await resolve(KEYS.hospital, USERS.ahmed, "bogus");
    assert.equal(res.status, 400);
    const afterCount = await prisma.auditLog.count({
      where: { result: "INVALID_CONTEXT" },
    });
    assert.equal(afterCount, before + 1);
  });

  it("rejects a malformed user id", async () => {
    const res = await request(
      "GET",
      "/api/v1/users/not-a-uuid/name?context=medical",
      { token: KEYS.hospital },
    );
    assert.equal(res.status, 400);
  });
});

// end-to-end lifecycle: register, login, build name, grant, resolve, revoke, audit
describe("account and consent lifecycle", () => {
  const email = `lifecycle+${Date.now()}@example.com`;
  const password = "lifecycle-password";
  const requesterName = `Lifecycle Requester ${Date.now()}`;
  let userId = "";
  let token = "";
  let requesterId = "";
  let requesterKey = "";
  let familyJpanId = "";
  let givenJpanId = "";
  let givenLatnId = "";
  let familyLatnId = "";
  let legalPermissionId = "";

  after(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.requester.deleteMany({ where: { name: requesterName } });
    await prisma.auditLog.deleteMany({
      where: { userId: null, requesterId: null },
    });
    await prisma.$disconnect();
  });

  it("registers a new user", async () => {
    const res = await request("POST", "/api/v1/users", {
      body: { email, password },
    });
    assert.equal(res.status, 201);
    userId = res.body.id as string;
  });

  it("rejects a duplicate email", async () => {
    const res = await request("POST", "/api/v1/users", {
      body: { email, password },
    });
    assert.equal(res.status, 409);
  });

  it("rejects a short password", async () => {
    const res = await request("POST", "/api/v1/users", {
      body: { email: `x${email}`, password: "short" },
    });
    assert.equal(res.status, 400);
  });

  it("logs in and returns identical 401s for bad email and bad password", async () => {
    const ok = await request("POST", "/api/v1/sessions", {
      body: { email, password },
    });
    assert.equal(ok.status, 201);
    token = ok.body.token as string;

    const badPassword = await request("POST", "/api/v1/sessions", {
      body: { email, password: "wrong-password" },
    });
    const badEmail = await request("POST", "/api/v1/sessions", {
      body: { email: `missing+${Date.now()}@example.com`, password },
    });
    assert.equal(badPassword.status, 401);
    assert.equal(badEmail.status, 401);
    assert.deepEqual(badPassword.body, badEmail.body);
  });

  it("rejects an invalid session token", async () => {
    const res = await request("GET", `/api/v1/users/${userId}/name-components`, {
      token: "nomi_sess_invalid",
    });
    assert.equal(res.status, 401);
  });

  it("blocks access to another user's data", async () => {
    const res = await request(
      "GET",
      `/api/v1/users/${USERS.ahmed}/name-components`,
      { token },
    );
    assert.equal(res.status, 403);
  });

  it("adds name components in two scripts", async () => {
    const add = (type: string, value: string, script: string) =>
      request("POST", `/api/v1/users/${userId}/name-components`, {
        token,
        body: { type, value, script },
      });
    const familyJpan = await add("FAMILY", "田中", "Jpan");
    const givenJpan = await add("GIVEN", "花", "Jpan");
    const givenLatn = await add("GIVEN", "Hana", "Latn");
    const familyLatn = await add("FAMILY", "Tanaka", "Latn");
    for (const res of [familyJpan, givenJpan, givenLatn, familyLatn]) {
      assert.equal(res.status, 201);
    }
    familyJpanId = familyJpan.body.id as string;
    givenJpanId = givenJpan.body.id as string;
    givenLatnId = givenLatn.body.id as string;
    familyLatnId = familyLatn.body.id as string;
  });

  it("rejects an invalid script code", async () => {
    const res = await request("POST", `/api/v1/users/${userId}/name-components`, {
      token,
      body: { type: "GIVEN", value: "X", script: "latin" },
    });
    assert.equal(res.status, 400);
  });

  it("assembles ordered identities", async () => {
    const legal = await request("POST", `/api/v1/users/${userId}/identities`, {
      token,
      body: {
        context: "legal",
        label: "Legal (kanji)",
        componentIds: [familyJpanId, givenJpanId],
      },
    });
    assert.equal(legal.status, 201);
    const employment = await request(
      "POST",
      `/api/v1/users/${userId}/identities`,
      {
        token,
        body: {
          context: "employment",
          label: "Work (romaji)",
          isDefault: true,
          componentIds: [givenLatnId, familyLatnId],
        },
      },
    );
    assert.equal(employment.status, 201);
  });

  it("rejects a second identity for the same context", async () => {
    const res = await request("POST", `/api/v1/users/${userId}/identities`, {
      token,
      body: {
        context: "legal",
        label: "Duplicate",
        componentIds: [givenLatnId],
      },
    });
    assert.equal(res.status, 409);
  });

  it("rejects duplicate component ids in one identity", async () => {
    const res = await request("POST", `/api/v1/users/${userId}/identities`, {
      token,
      body: {
        context: "casual",
        label: "Broken",
        componentIds: [givenLatnId, givenLatnId],
      },
    });
    assert.equal(res.status, 400);
  });

  it("registers a requester through the admin endpoint", async () => {
    const res = await request("POST", "/api/v1/requesters", {
      token: ADMIN_KEY,
      body: { name: requesterName, type: "EMPLOYER" },
    });
    assert.equal(res.status, 201);
    requesterId = res.body.id as string;
    requesterKey = res.body.apiKey as string;

    const rejected = await request("POST", "/api/v1/requesters", {
      token: "wrong-admin-key",
      body: { name: "Nope", type: "OTHER" },
    });
    assert.equal(rejected.status, 401);
  });

  it("lists the requester in the public directory", async () => {
    const res = await request("GET", "/api/v1/requesters");
    assert.equal(res.status, 200);
    const names = (res.body as unknown as { name: string }[]).map(
      (r) => r.name,
    );
    assert.ok(names.includes(requesterName));
  });

  it("denies resolution before any grant", async () => {
    const res = await resolve(requesterKey, userId, "legal");
    assert.equal(res.status, 403);
  });

  it("grants legal access and resolves the unspaced kanji name", async () => {
    const grant = await request("POST", `/api/v1/users/${userId}/permissions`, {
      token,
      body: { requesterId, context: "legal" },
    });
    assert.equal(grant.status, 201);
    legalPermissionId = grant.body.id as string;

    const res = await resolve(requesterKey, userId, "legal");
    assert.equal(res.status, 200);
    assert.equal(displayOf(res.body), "田中花");
  });

  it("keeps contexts isolated until each is granted", async () => {
    const denied = await resolve(requesterKey, userId, "employment");
    assert.equal(denied.status, 403);

    const grant = await request("POST", `/api/v1/users/${userId}/permissions`, {
      token,
      body: { requesterId, context: "employment" },
    });
    assert.equal(grant.status, 201);

    const res = await resolve(requesterKey, userId, "employment");
    assert.equal(res.status, 200);
    assert.equal(displayOf(res.body), "Hana Tanaka");
  });

  it("serves the default identity as fallback for an unconfigured context", async () => {
    const grant = await request("POST", `/api/v1/users/${userId}/permissions`, {
      token,
      body: { requesterId, context: "education" },
    });
    assert.equal(grant.status, 201);

    const res = await resolve(requesterKey, userId, "education");
    assert.equal(res.status, 200);
    assert.equal(fallbackOf(res.body), true);
    assert.equal(displayOf(res.body), "Hana Tanaka");
  });

  it("revokes a grant and denies immediately", async () => {
    const revoke = await request(
      "DELETE",
      `/api/v1/users/${userId}/permissions/${legalPermissionId}`,
      { token },
    );
    assert.equal(revoke.status, 204);

    const res = await resolve(requesterKey, userId, "legal");
    assert.equal(res.status, 403);
  });

  it("records the full history in the audit log", async () => {
    const res = await request("GET", `/api/v1/users/${userId}/audit`, {
      token,
    });
    assert.equal(res.status, 200);
    const rows = res.body as unknown as { action: string; result: string }[];
    const actions = rows.map((r) => `${r.action}:${r.result}`);
    assert.ok(actions.includes("PERMISSION_GRANT:SUCCESS"));
    assert.ok(actions.includes("PERMISSION_REVOKE:SUCCESS"));
    assert.ok(actions.includes("NAME_RESOLUTION:SUCCESS"));
    assert.ok(actions.includes("NAME_RESOLUTION:DENIED_NO_PERMISSION"));
  });

  it("changes the default identity", async () => {
    const listIdentities = await request("GET", `/api/v1/users/${userId}/identities`, { token });
    assert.equal(listIdentities.status, 200);
    const identities = listIdentities.body as unknown as { id: string; isDefault: boolean }[];
    const nonDefault = identities.find((i) => !i.isDefault);
    assert.ok(nonDefault);

    const updateRes = await request("PATCH", `/api/v1/users/${userId}/identities/${nonDefault.id}`, {
      token,
      body: { isDefault: true },
    });
    assert.equal(updateRes.status, 200);
    assert.equal((updateRes.body as unknown as { isDefault: boolean }).isDefault, true);
  });

  it("deletes an identity and a name component", async () => {
    const listIdentities = await request("GET", `/api/v1/users/${userId}/identities`, { token });
    assert.equal(listIdentities.status, 200);
    const identities = listIdentities.body as unknown as { id: string }[];
    const identityId = identities[0].id;

    const delIdentity = await request("DELETE", `/api/v1/users/${userId}/identities/${identityId}`, { token });
    assert.equal(delIdentity.status, 204);

    const listComponents = await request("GET", `/api/v1/users/${userId}/name-components`, { token });
    assert.equal(listComponents.status, 200);
    const components = listComponents.body as unknown as { id: string }[];
    const componentId = components[0].id;

    const delComponent = await request("DELETE", `/api/v1/users/${userId}/name-components/${componentId}`, { token });
    assert.equal(delComponent.status, 204);
  });

  it("deletes a name component and automatically cleans up empty identities", async () => {
    const comp = await request("POST", `/api/v1/users/${userId}/name-components`, {
      token,
      body: { type: "NICKNAME", value: "TempComp", script: "Latn" },
    });
    assert.equal(comp.status, 201);
    const compId = comp.body.id as string;

    const ident = await request("POST", `/api/v1/users/${userId}/identities`, {
      token,
      body: {
        context: "financial",
        label: "Temp Identity",
        componentIds: [compId],
      },
    });
    assert.equal(ident.status, 201);
    const identId = ident.body.id as string;

    const delComp = await request("DELETE", `/api/v1/users/${userId}/name-components/${compId}`, { token });
    assert.equal(delComp.status, 204);

    const listIdentities = await request("GET", `/api/v1/users/${userId}/identities`, { token });
    assert.equal(listIdentities.status, 200);
    const remainingIdentities = listIdentities.body as unknown as { id: string }[];
    assert.equal(remainingIdentities.some((i) => i.id === identId), false);
  });
});
