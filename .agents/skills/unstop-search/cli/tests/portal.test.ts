import { afterEach, expect, test } from "bun:test"
import { PORTAL } from "../src/portal"

export const LIVE_QUERY = ["-q", "software engineer"]

const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch })

function item(over: Record<string, unknown>) {
  return {
    id: 1773319, title: "Backend Developer", seo_url: "https://unstop.com/jobs/backend-developer-acme-1773319",
    organisation: { name: "Acme" }, locations: [{ city: "Delhi" }], approved_date: "2026-10-22 11:54:44 GMT+0530",
    filters: [{ type: "eligible", name: "Fresher" }], required_skills: [{ skill_name: "Node.js" }],
    jobDetail: { min_salary: 300000, max_salary: 500000, show_salary: 1, pay_in: "annually", type: "in_office", min_experience: null, max_experience: null },
    ...over,
  }
}

test("search maps fresher tags, salary and dates", async () => {
  let seen = ""
  globalThis.fetch = (async (url: string) => {
    seen = String(url)
    return new Response(JSON.stringify({ data: { data: [item({})] } }))
  }) as typeof fetch
  const jobs = await PORTAL.search({ query: "backend", page: 1 })
  expect(seen).toContain("searchTerm=backend")
  expect(seen).toContain("opportunity=jobs")
  expect(jobs[0]).toMatchObject({ id: "1773319", company: "Acme", location: "Delhi", salary: "₹3-5 LPA", minExperience: 0, date: "2026-10-22", skills: ["Node.js"] })
})

test("experienced-only tag counts as not-fresher", async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({ data: { data: [item({ filters: [{ type: "eligible", name: "Experienced Professionals" }] })] } }))) as typeof fetch
  const [job] = await PORTAL.search({ query: "x", page: 1 })
  expect(job.minExperience).toBe(1)
})

test("parseRef accepts ids and unstop URLs only", () => {
  expect(PORTAL.parseRef("1773319")).toBe("1773319")
  expect(PORTAL.parseRef("https://unstop.com/jobs/backend-developer-acme-1773319")).toBe("1773319")
  expect(PORTAL.parseRef("https://unstop.com.evil.io/jobs/x-1773319")).toBeNull()
})
