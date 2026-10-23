import { afterEach, expect, test } from "bun:test"
import { PORTAL, loadCompanies, minYears } from "../src/portal"

export const LIVE_QUERY = ["-q", "engineer", "--company", "stripe,paytm,sarvam,swiggy"]

const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch })

test("companies.json lists boards with a known ATS", () => {
  const cs = loadCompanies()
  expect(cs.length).toBeGreaterThan(20)
  for (const c of cs) expect(["greenhouse", "lever", "ashby", "smartrecruiters"]).toContain(c.ats)
})

test("search keeps India roles, matches title words and flags senior titles", async () => {
  globalThis.fetch = (async (url: string) => {
    if (String(url).includes("greenhouse")) {
      return new Response(JSON.stringify({ jobs: [
        { id: 1, title: "Software Engineer, Payin", location: { name: "Bengaluru, India" }, first_published: "2026-10-21T00:00:00Z", absolute_url: "https://stripe.com/jobs/search?gh_jid=1" },
        { id: 2, title: "Senior Software Engineer", location: { name: "Bengaluru" }, first_published: "2026-10-20T00:00:00Z", absolute_url: "https://x/2" },
        { id: 3, title: "Software Engineer", location: { name: "Seattle, WA" }, first_published: "2026-10-20T00:00:00Z", absolute_url: "https://x/3" },
      ] }))
    }
    return new Response("[]")
  }) as typeof fetch
  const jobs = await PORTAL.search({ query: "software engineer", page: 1, extra: { company: "stripe" } })
  expect(jobs.map((j) => j.id)).toEqual(["greenhouse:stripe:1", "greenhouse:stripe:2"])
  expect(jobs[0]).toMatchObject({ company: "Stripe", date: "2026-10-21", minExperience: null })
  expect(jobs[1].minExperience).toBe(3)
})

test("an unknown --company slug is an error, not an empty search", async () => {
  await expect(PORTAL.search({ query: "", page: 1, extra: { company: "nope-not-listed" } })).rejects.toThrow(/not in companies.json/)
})

test("parseRef understands ATS URLs and ref ids", () => {
  expect(PORTAL.parseRef("greenhouse:stripe:8185012")).toBe("greenhouse:stripe:8185012")
  expect(PORTAL.parseRef("https://job-boards.greenhouse.io/hackerrank/jobs/8229735")).toBe("greenhouse:hackerrank:8229735")
  expect(PORTAL.parseRef("https://jobs.lever.co/paytm/95eadc2b-27bf-40fe-b6e6-93aaeadd08f7")).toBe("lever:paytm:95eadc2b-27bf-40fe-b6e6-93aaeadd08f7")
  expect(PORTAL.parseRef("https://jobs.ashbyhq.com/sarvam/db89b576-2456-4cc4-ab0b-c45f8c6c27f0")).toBe("ashby:sarvam:db89b576-2456-4cc4-ab0b-c45f8c6c27f0")
  expect(PORTAL.parseRef("https://stripe.com/jobs/search?gh_jid=8185012")).toBe("greenhouse:stripe:8185012")
  expect(PORTAL.parseRef("https://jobs.lever.co.evil.io/paytm/x")).toBeNull()
})

test("minYears reads the lowest stated experience", () => {
  expect(minYears("We need 3+ years of backend work; 1-2 years with Kafka is a plus")).toBe(1)
  expect(minYears("0-2 yrs experience")).toBe(0)
  expect(minYears("no requirement stated")).toBeNull()
})
