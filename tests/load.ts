import "dotenv/config";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const TOTAL = Number(process.env.TOTAL ?? 500);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 25);

const KEY = "nomi_dev_government";
const USER = "00000000-0000-4000-8000-000000000001";
const URL = `${BASE}/api/v1/users/${USER}/name?context=legal`;

// fires TOTAL requests at CONCURRENCY parallel workers and reports latency percentiles
async function main() {
  const latencies: number[] = [];
  let errors = 0;
  let next = 0;

  const started = performance.now();
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < TOTAL) {
        next += 1;
        const start = performance.now();
        try {
          const res = await fetch(URL, {
            headers: { Authorization: `Bearer ${KEY}` },
          });
          await res.text();
          if (res.status !== 200) errors += 1;
        } catch {
          errors += 1;
        }
        latencies.push(performance.now() - start);
      }
    }),
  );
  const wallMs = performance.now() - started;

  // sort and compute percentile latency distribution
  const sorted = [...latencies].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.floor(q * (sorted.length - 1))];

  console.log(`Requests: ${latencies.length}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Errors: ${errors}`);
  console.log(`Throughput: ${(latencies.length / (wallMs / 1000)).toFixed(1)} req/s`);
  console.table({
    latency_ms: {
      p50: at(0.5).toFixed(1),
      p95: at(0.95).toFixed(1),
      p99: at(0.99).toFixed(1),
      max: at(1).toFixed(1),
    },
  });

  // any non-200 response counts as a failure
  if (errors > 0) {
    console.log("FAIL: errors under load");
    process.exit(1);
  }
  console.log("PASS: no errors under load");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
