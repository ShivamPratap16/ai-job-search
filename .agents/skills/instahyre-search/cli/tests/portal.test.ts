import { afterEach, expect, test } from "bun:test"
import { PORTAL } from "../src/portal"

export const LIVE_QUERY = ["-q", "Java", "-e", "0"]

const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch })

test("search maps API objects and sends skills + years", async () => {
  let seen = ""
  globalThis.fetch = (async (url: string) => {
    seen = String(url)
    return new Response(JSON.stringify({ meta: {}, objects: [{
      id: 427995, title: "Python Developer", locations: "Hyderabad,Noida",
      public_url: "https://www.instahyre.com/job-427995-python-developer/",
      employer: { company_name: "TGH Software Solutions" }, keywords: ["Django", "Python"],
    }] }))
  }) as typeof fetch
  const jobs = await PORTAL.search({ query: "Python", experience: 0, page: 2 })
  expect(seen).toContain("skills=Python")
  expect(seen).toContain("years=0")
  expect(seen).toContain("offset=35")
  expect(jobs[0]).toMatchObject({ id: "427995", company: "TGH Software Solutions", location: "Hyderabad, Noida", skills: ["Django", "Python"] })
})

test("detail reads the JobPosting JSON-LD", async () => {
  globalThis.fetch = (async () => new Response(`<link rel="canonical" href="https://www.instahyre.com/job-1-x/">
    <script type="application/ld+json">{"@type":"JobPosting","title":"SDE","description":"<p>Build APIs</p>",
    "datePosted":"2026-06-09","employmentType":"FULL_TIME","hiringOrganization":{"name":"Acme"},
    "jobLocation":[{"address":{"addressLocality":"Pune"}}]}</script>`)) as typeof fetch
  const d = await PORTAL.detail("1")
  expect(d).toMatchObject({ title: "SDE", company: "Acme", location: "Pune", date: "2026-06-09", description: "Build APIs" })
})

test("parseRef accepts ids and instahyre URLs only", () => {
  expect(PORTAL.parseRef("427995")).toBe("427995")
  expect(PORTAL.parseRef("https://www.instahyre.com/job-427995-python-developer-at-x/")).toBe("427995")
  expect(PORTAL.parseRef("https://instahyre.com.evil.io/job-427995-x/")).toBeNull()
})
