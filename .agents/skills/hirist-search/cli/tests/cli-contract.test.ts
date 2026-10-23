// Shared contract tests for the India portal CLIs: flag validation and the
// core helpers. Identical in every India portal skill; portal parsing is
// covered by portal.test.ts next to this file.
import { describe, expect, test } from "bun:test"
import { runCLI } from "./helpers"
import {
  applyFilters, expRange, htmlToText, isoDate, jsonLdJobPostings, lpa, relativeToIso, salaryRange, type Job,
} from "../src/core"

function err(stderr: string): { error: string; code: string } {
  return JSON.parse(stderr.split("\n").pop() as string)
}

describe("flag contract", () => {
  test("unknown flag exits 1 with a JSON error on stderr", async () => {
    const r = await runCLI(["search", "-q", "java", "--bogus", "x"])
    expect(r.exitCode).toBe(1)
    expect(r.stdout).toBe("")
    expect(err(r.stderr).code).toBe("UNKNOWN_FLAG")
  })
  test("empty --query is rejected", async () => {
    const r = await runCLI(["search", "-q", ""])
    expect(r.exitCode).toBe(1)
    expect(["EMPTY_QUERY", "NO_QUERY"]).toContain(err(r.stderr).code)
  })
  test("non-numeric --experience is rejected", async () => {
    const r = await runCLI(["search", "-q", "java", "-e", "two"])
    expect(r.exitCode).toBe(1)
    expect(err(r.stderr).code).toBe("BAD_NUMBER")
  })
  test("--page 0 is rejected", async () => {
    const r = await runCLI(["search", "-q", "java", "--page", "0"])
    expect(r.exitCode).toBe(1)
    expect(err(r.stderr).code).toBe("BAD_NUMBER")
  })
  test("bad --format is rejected", async () => {
    const r = await runCLI(["search", "-q", "java", "--format", "xml"])
    expect(r.exitCode).toBe(1)
    expect(err(r.stderr).code).toBe("BAD_FORMAT")
  })
  test("detail without an id is rejected", async () => {
    const r = await runCLI(["detail"])
    expect(r.exitCode).toBe(1)
    expect(err(r.stderr).code).toBe("NO_ID")
  })
  test("detail on a foreign host is rejected, not fetched", async () => {
    const r = await runCLI(["detail", "https://evil.example.com/job/123456789"])
    expect(r.exitCode).toBe(1)
    expect(err(r.stderr).code).toBe("BAD_ID")
  })
  test("unknown command is rejected", async () => {
    const r = await runCLI(["apply", "-q", "java"])
    expect(r.exitCode).toBe(1)
    expect(err(r.stderr).code).toBe("UNKNOWN_COMMAND")
  })
  test("no command prints help and exits 1", async () => {
    const r = await runCLI([])
    expect(r.exitCode).toBe(1)
    expect(r.stdout).toContain("USAGE")
  })
})

describe("core helpers", () => {
  test("lpa formats rupees per year", () => {
    expect(lpa(550000)).toBe("₹5.5 LPA")
    expect(lpa(1200000)).toBe("₹12 LPA")
    expect(lpa(0)).toBeNull()
  })
  test("salaryRange joins min and max", () => {
    expect(salaryRange(300000, 500000)).toBe("₹3-5 LPA")
    expect(salaryRange(300000, 300000)).toBe("₹3 LPA")
    expect(salaryRange(null, null)).toBeNull()
  })
  test("expRange", () => {
    expect(expRange(0, 2)).toBe("0-2 yrs")
    expect(expRange(1, null)).toBe("1+ yrs")
    expect(expRange(null, null)).toBeNull()
  })
  test("relativeToIso", () => {
    const now = new Date("2026-10-23T12:00:00Z")
    expect(relativeToIso("3 days ago", now)).toBe("2026-10-20")
    expect(relativeToIso("1 week ago", now)).toBe("2026-10-16")
    expect(relativeToIso("Few hours ago", now)).toBe("2026-10-23")
    expect(relativeToIso("sometime", now)).toBeNull()
  })
  test("isoDate handles epoch ms and strings", () => {
    expect(isoDate(Date.UTC(2026, 9, 1))).toBe("2026-10-01")
    expect(isoDate("2026-10-13T12:23:40.700Z")).toBe("2026-10-13")
    expect(isoDate("not a date")).toBeNull()
  })
  test("htmlToText keeps list structure and drops scripts", () => {
    const t = htmlToText("<p>Role</p><ul><li>Java</li><li>SQL &amp; Redis</li></ul><script>x()</script>")
    expect(t).toBe("Role\n• Java\n• SQL & Redis")
  })
  test("applyFilters drops jobs above the experience ceiling and older than jobage", () => {
    const base: Job = {
      id: "1", title: "t", company: null, location: null, date: "2026-10-22", url: "u",
      experience: null, minExperience: 0, salary: null, skills: [],
    }
    const jobs = [base, { ...base, id: "2", minExperience: 3 }, { ...base, id: "3", date: "2026-09-01" },
      { ...base, id: "4", minExperience: null, date: null }]
    const now = new Date("2026-10-23T00:00:00Z")
    const kept = applyFilters(jobs, { query: "q", page: 1, experience: 1, jobage: 7 }, now).map((j) => j.id)
    expect(kept).toEqual(["1", "4"])
  })
  test("jsonLdJobPostings finds JobPosting in plain and @graph blocks", () => {
    const html = `<script type="application/ld+json">{"@type":"Organization"}</script>
      <script type="application/ld+json">{"@graph":[{"@type":"JobPosting","title":"SDE"}]}</script>
      <script type="application/ld+json">not json</script>`
    expect(jsonLdJobPostings(html).map((j) => j.title)).toEqual(["SDE"])
  })
})
