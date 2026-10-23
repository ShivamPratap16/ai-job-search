import { afterEach, expect, test } from "bun:test"
import { PORTAL } from "../src/portal"

export const LIVE_QUERY = ["-q", "backend", "-e", "1"]

const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch })

const JOB = {
  id: 1674308, title: "Lendingkart - Software Engineer - Backend", min: 1, max: 3,
  jobDetailUrl: "https://www.hirist.tech/j/lendingkart-software-engineer-backend-1674308",
  createdTimeMs: Date.UTC(2026, 8, 24), locations: [{ name: "Bangalore" }], hideSal: 1, minSal: 0, maxSal: 0,
  companyData: { companyName: "LendingKart" }, tags: [{ name: "Java" }, { name: "Spring Boot" }],
}

test("search sends the experience window and maps fields", async () => {
  let seen = ""
  globalThis.fetch = (async (url: string) => {
    seen = String(url)
    return new Response(JSON.stringify({ data: [JOB] }))
  }) as typeof fetch
  const jobs = await PORTAL.search({ query: "backend", experience: 1, page: 1 })
  expect(seen).toContain("maxexp=1")
  expect(seen).toContain("pageNo=0")
  expect(jobs[0]).toMatchObject({ id: "1674308", company: "LendingKart", location: "Bangalore", experience: "1-3 yrs", minExperience: 1, salary: null, date: "2026-09-24", skills: ["Java", "Spring Boot"] })
})

test("detail joins intro and description text", async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({ data: { ...JOB, introText: "<p>About the role</p>", description: "<ul><li>Build services</li></ul>" } }))) as typeof fetch
  const d = await PORTAL.detail("1674308")
  expect(d?.description).toBe("About the role\n• Build services")
})

test("parseRef accepts ids and hirist URLs only", () => {
  expect(PORTAL.parseRef("1674308")).toBe("1674308")
  expect(PORTAL.parseRef("https://www.hirist.tech/j/lendingkart-software-engineer-1674308")).toBe("1674308")
  expect(PORTAL.parseRef("https://hirist.tech.evil.io/j/x-1674308")).toBeNull()
})
