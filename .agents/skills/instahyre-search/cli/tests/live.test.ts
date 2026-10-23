// Live smoke test against the real portal. Network-dependent, so it only runs
// when PORTAL_LIVE_TESTS=1 (run it after a portal changes its markup):
//   PORTAL_LIVE_TESTS=1 bun test tests/live.test.ts
import { expect, test } from "bun:test"
import { parseJSON, runCLI } from "./helpers"
import { LIVE_QUERY } from "./portal.test"

const live = process.env.PORTAL_LIVE_TESTS === "1"

test.skipIf(!live)("live search returns real results", async () => {
  const out = parseJSON<{ results: { id: string; title: string; url: string }[] }>(
    await runCLI(["search", ...LIVE_QUERY, "--limit", "3"]),
  )
  expect(out.results.length).toBeGreaterThan(0)
  for (const r of out.results) {
    expect(r.id).toBeTruthy()
    expect(r.title).toBeTruthy()
    expect(r.url).toMatch(/^https:\/\//)
  }
}, 60000)
