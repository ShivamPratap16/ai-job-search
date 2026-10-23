// Data source: Instahyre's public job-search API (JSON, no login) and the public
// job page, whose schema.org JobPosting JSON-LD carries the full description.
// The API filters by skill/job-function and by the candidate's years of
// experience; it has no location or posting-date parameter, so --location is
// applied client-side and --jobage only applies on `detail` (search has no dates).

import {
  clean, fetchJSON, fetchText, htmlToText, isoDate, jsonLdJobPostings,
  type Job, type JobDetail, type SearchParams,
} from "./core.js"

const UA = "Mozilla/5.0 (compatible; instahyre-search-cli/1.0)"
const API = "https://www.instahyre.com/api/v1/job_search"
const PAGE_SIZE = 35

export const HELP = `instahyre-cli — search jobs on Instahyre (India)

USAGE
  bun run src/cli.ts search -q "<skill or job function>" [flags]
  bun run src/cli.ts detail <id|url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>       Skill or job function, e.g. "Java", "Python", "Spring Boot",
                           "Backend Development". REQUIRED.
  --experience, -e <yrs>   Your years of experience (0 for freshers). Server-side filter.
  --location, -l <city>    City, e.g. Bangalore, Pune, "Work From Home" (client-side filter).
  --page <n>               1-indexed page (${PAGE_SIZE} results/page). Default 1.
  --limit, -n <n>          Cap results emitted.
  --jobage <days>          Accepted for contract parity; Instahyre search results carry no
                           posting date, so it filters nothing on search.
  --format <fmt>           json (default) | table | plain.

EXAMPLES
  bun run src/cli.ts search -q "Java" -e 0 --format table
  bun run src/cli.ts search -q "Backend Development" -e 1 -l Bangalore --format table
  bun run src/cli.ts detail 427995 --format plain
`

function toJob(o: any): Job {
  return {
    id: String(o.id),
    title: clean(o.title || o.candidate_title) || "(untitled)",
    company: clean(o.employer?.company_name) || null,
    location: o.locations ? String(o.locations).split(",").map((s) => s.trim()).join(", ") : null,
    date: null,
    url: o.public_url || `https://www.instahyre.com/job-${o.id}/`,
    experience: null,
    minExperience: null,
    salary: null,
    skills: Array.isArray(o.keywords) ? o.keywords.map(String) : [],
  }
}

async function search(p: SearchParams): Promise<Job[]> {
  const params = new URLSearchParams({
    skills: p.query,
    limit: String(PAGE_SIZE),
    offset: String((p.page - 1) * PAGE_SIZE),
  })
  if (p.experience !== undefined) params.set("years", String(p.experience))
  const data = await fetchJSON<any>(`${API}?${params}`, UA)
  return (data?.objects ?? []).map(toJob)
}

function parseRef(input: string): string | null {
  const t = input.trim()
  if (/^\d{3,}$/.test(t)) return t
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`)
    if (!/(^|\.)instahyre\.com$/i.test(u.hostname)) return null
    const m = u.pathname.match(/^\/job-(\d+)(?:-|\/|$)/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

async function detail(id: string): Promise<JobDetail | null> {
  const html = await fetchText(`https://www.instahyre.com/job-${id}/`, UA)
  if (!html) return null
  const jp = jsonLdJobPostings(html)[0]
  if (!jp) return null
  const loc = [].concat(jp.jobLocation ?? []).map((l: any) => l?.address?.addressLocality).filter(Boolean)
  const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1]
  return {
    id,
    title: clean(jp.title) || "(untitled)",
    company: clean(jp.hiringOrganization?.name) || null,
    location: loc.length ? loc.join(", ") : null,
    date: isoDate(jp.datePosted),
    url: canonical || `https://www.instahyre.com/job-${id}/`,
    experience: null,
    minExperience: null,
    salary: null,
    skills: [],
    description: htmlToText(jp.description),
    deadline: isoDate(jp.validThrough),
    employmentType: jp.employmentType ? String(jp.employmentType) : null,
    applyUrl: canonical || `https://www.instahyre.com/job-${id}/`,
    isActive: !jp.validThrough || new Date(jp.validThrough).getTime() >= Date.now(),
  }
}

export const PORTAL = {
  name: "instahyre",
  help: HELP,
  requiresQuery: true,
  serverLocation: false,
  search,
  parseRef,
  detail,
}
