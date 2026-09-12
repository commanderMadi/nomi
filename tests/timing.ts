import "dotenv/config";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SAMPLES = Number(process.env.SAMPLES ?? 100);
const THRESHOLD = Number(process.env.THRESHOLD ?? 0.3);

const KEY = "nomi_dev_broker";
const KNOWN_USER = "00000000-0000-4000-8000-000000000001";
const UNKNOWN_USER = "00000000-0000-4000-8000-0000000000ff";

function url(userId: string) {
  return `${BASE}/api/v1/users/${userId}/name?context=medical`;
}

// time a single denial request, both paths must return 403
async function measure(target: string): Promise<number> {
  const start = performance.now();
  const res = await fetch(target, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  await res.text();
  if (res.status !== 403) {
    throw new Error(`Expected 403, got ${res.status}`);
  }
  return performance.now() - start;
}

function stats(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.floor(q * (sorted.length - 1))];
  return {
    median: at(0.5),
    p95: at(0.95),
    mean: samples.reduce((a, b) => a + b, 0) / samples.length,
  };
}

async function main() {
  // warm up to stabilize jit and connection pool
  for (let i = 0; i < 15; i++) {
    await measure(url(KNOWN_USER));
    await measure(url(UNKNOWN_USER));
  }

  const known: number[] = [];
  const unknown: number[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    known.push(await measure(url(KNOWN_USER)));
    unknown.push(await measure(url(UNKNOWN_USER)));
  }

  const knownStats = stats(known);
  const unknownStats = stats(unknown);
  const delta =
    Math.abs(knownStats.median - unknownStats.median) /
    Math.max(knownStats.median, unknownStats.median);

  console.log(`Samples per path: ${SAMPLES}`);
  console.table({
    "no permission (user exists)": knownStats,
    "unknown user": unknownStats,
  });
  console.log(`Median delta: ${(delta * 100).toFixed(1)}%`);
  console.log(`Threshold: ${(THRESHOLD * 100).toFixed(0)}%`);

  // if the median delta exceeds the threshold, an attacker could distinguish the paths
  if (delta > THRESHOLD) {
    console.log("FAIL: timing difference may leak user existence");
    process.exit(1);
  }
  console.log("PASS: denial paths are statistically indistinguishable");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
