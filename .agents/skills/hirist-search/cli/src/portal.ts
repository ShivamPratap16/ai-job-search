// Data source: Hirist's public job APIs on gladiator.hirist.tech (JSON, no login):
//   search: /job/search?query=...&minexp=&maxexp=&pageNo=&size=
//   detail: /job/detail?jobcode=<id>
// Hirist is a tech-only board (the IIMjobs group) with stated experience ranges
// on every posting.

import {
  clean, expRange, fetchJSON, htmlToText, isoDate, salaryRange,
  type Job, type JobDetail, type SearchParams,
} from "./core.js"

const UA = "Mozilla/5.0 (compatible; hirist-search-cli/1.0)"
const API = "https://gladiator.hirist.tech/job"
const PAGE_SIZE = 30

export const HELP = `hirist-cli — search tech jobs on Hirist (India)

USAGE
  bun run src/cli.ts search -q "<keywords>" [flags]
  bun run src/cli.ts detail <id|url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>       Keywords, e.g. "backend", "java", "python developer". REQUIRED.
  --experience, -e <yrs>   Your years of experience; server-side (jobs whose range starts
                           at or below it).
  --location, -l <city>    City, e.g. Bangalore, Gurgaon, Pune (client-side filter).
  --jobage <days>          Keep jobs posted within N days.
  --page <n>               1-indexed page (${PAGE_SIZE} results/page). Default 1.
  --limit, -n <n>          Cap results emitted.
  --format <fmt>           json (default) | table | plain.

EXAMPLES
  bun run src/cli.ts search -q backend -e 1 --format table
  bun run src/cli.ts search -q java -e 0 -l Bangalore --jobage 14 --format plain
  bun run src/cli.ts detail 1674308 --format plain
`

function toJob(o: any): Job {
  const min = o.min !== undefined && o.min !== null ? Number(o.min) : null
  const max = o.max !== undefined && o.max !== null ? Number(o.max) : null
  const locs = (o.locations ?? o.location ?? []).map((l: any) => l?.name).filter(Boolean)
  const lakh = (n: any) => (Number(n) > 0 ? Number(n) * 100000 : null)
  return {
    id: String(o.id),
    title: clean(o.title) || "(untitled)",
    company: clean(o.companyData?.companyName) || null,
    location: locs.length ? locs.join(", ") : o.workFromHome ? "Remote" : null,
    date: isoDate(Number(o.createdTimeMs || o.createdTime) || null),
    url: o.jobDetailUrl || `https://www.hirist.tech/j/${o.id}`,
    experience: expRange(min, max),
    minExperience: min,
    salary: Number(o.hideSal) ? null : salaryRange(lakh(o.minSal), lakh(o.maxSal)),
    skills: (o.tags ?? []).map((t: any) => String(t.name)).filter(Boolean),
  }
}

async function search(p: SearchParams): Promise<Job[]> {
  const params = new URLSearchParams({
    query: p.query,
    pageNo: String(p.page - 1),
    size: String(PAGE_SIZE),
  })
  if (p.experience !== undefined) {
    params.set("minexp", "0")
    params.set("maxexp", String(p.experience))
  }
  const data = await fetchJSON<any>(`${API}/search?${params}`, UA)
  return (data?.data ?? []).map(toJob)
}

function parseRef(input: string): string | null {
  const t = input.trim()
  if (/^\d{5,}$/.test(t)) return t
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`)
    if (!/(^|\.)hirist\.(tech|com)$/i.test(u.hostname)) return null
    const m = u.pathname.match(/^\/j\/(?:[a-z0-9-]*-)?(\d{5,})\/?$/i)
    return m ? m[1] : null
  } catch {
    return null
  }
}

async function detail(id: string): Promise<JobDetail | null> {
  let data: any
  try {
    data = await fetchJSON<any>(`${API}/detail?jobcode=${encodeURIComponent(id)}`, UA)
  } catch (e) {
    if (/404/.test(String(e))) return null
    throw e
  }
  const o = data?.data
  if (!o) return null
  const job = toJob(o)
  const desc = [o.introText, o.description, o.jobDescription].filter(Boolean).join("\n")
  return {
    ...job,
    description: htmlToText(desc),
    deadline: null,
    employmentType: o.jobType ? String(o.jobType) : null,
    applyUrl: o.applyUrl || job.url,
    isActive: Number(o.status ?? 1) === 1,
  }
}

export const PORTAL = {
  name: "hirist",
  help: HELP,
  requiresQuery: true,
  serverLocation: false,
  search,
  parseRef,
  detail,
}
