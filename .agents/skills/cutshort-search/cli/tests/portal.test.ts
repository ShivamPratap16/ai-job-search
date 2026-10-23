import { expect, test } from "bun:test"
import { PORTAL, parseHub } from "../src/portal"

export const LIVE_QUERY = ["-q", "backend developer"]

function page(jobs: unknown[]): string {
  const data = { props: { pageProps: { dehydratedState: { queries: [
    { queryKey: ["jobListData", "x"], state: { data: { data: { pageData: { jobs } } } } },
  ] } } } }
  return `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>`
}

test("parseHub reads jobs from the Next.js state", () => {
  const jobs = parseHub(page([{
    _id: "a", publicUrl: "https://cutshort.io/job/Backend-Engineer-Bengaluru-Acme-PK2m2OYT", headline: "Backend Engineer",
    companyDetails: { name: "Acme" }, locationsText: "Bengaluru (Bangalore)", remoteType: "remote_not_okay",
    expRange: { min: 0, max: 2 }, salaryRange: { currency: "INR", min: 600000, max: 1200000, hideSalary: false },
    allSkills: ["Python", "Go"],
  }]))
  expect(jobs[0]).toMatchObject({
    id: "PK2m2OYT", title: "Backend Engineer", company: "Acme", location: "Bengaluru (Bangalore)",
    experience: "0-2 yrs", minExperience: 0, salary: "₹6-12 LPA", skills: ["Python", "Go"],
  })
})

test("hidden salaries stay hidden", () => {
  const jobs = parseHub(page([{ publicUrl: "https://cutshort.io/job/x-1", headline: "x", salaryRange: { currency: "INR", min: 1, max: 2, hideSalary: true } }]))
  expect(jobs[0].salary).toBeNull()
})

test("parseRef accepts cutshort job URLs only", () => {
  expect(PORTAL.parseRef("https://cutshort.io/job/Backend-Engineer-Acme-PK2m2OYT")).toBe("/job/Backend-Engineer-Acme-PK2m2OYT")
  expect(PORTAL.parseRef("https://cutshort.io.evil.io/job/x")).toBeNull()
})
