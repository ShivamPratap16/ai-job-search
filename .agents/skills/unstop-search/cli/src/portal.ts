// Data source: Unstop's public opportunity APIs (JSON, no login):
//   search: /api/public/opportunity/search-result?opportunity=jobs&searchTerm=...
//   detail: /api/public/competition/<id>
// Unstop jobs are mostly campus/fresher hiring; many carry an eligibility tag
// ("Fresher", "Experienced Professionals", "Engineering Students") instead of a
// year range, which is surfaced as the experience field.

import {
  clean, expRange, fetchJSON, htmlToText, isoDate, salaryRange,
  type Job, type JobDetail, type SearchParams,
} from "./core.js"

const UA = "Mozilla/5.0 (compatible; unstop-search-cli/1.0)"
const API = "https://unstop.com/api/public"
const PAGE_SIZE = 30

export const HELP = `unstop-cli — search jobs on Unstop (India; campus and fresher hiring)

USAGE
  bun run src/cli.ts search [-q "<keywords>"] [flags]
  bun run src/cli.ts detail <id|url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>       Keywords, e.g. "software engineer", "backend", "java".
                           Optional: omit to list every open job.
  --location, -l <city>    City, e.g. Bangalore, Delhi (client-side filter).
  --experience, -e <yrs>   Your years of experience; drops jobs whose stated minimum is
                           higher. 0 keeps fresher-tagged and unstated jobs.
  --jobage <days>          Keep jobs approved/opened within N days.
  --page <n>               1-indexed page (${PAGE_SIZE} results/page). Default 1.
  --limit, -n <n>          Cap results emitted.
  --format <fmt>           json (default) | table | plain.

EXAMPLES
  bun run src/cli.ts search -q "software engineer" -e 0 --format table
  bun run src/cli.ts search -q backend -l Bangalore --format plain
  bun run src/cli.ts detail 1773319 --format plain
`

function eligibility(filters: any[] | undefined): string[] {
  return (filters ?? []).filter((f) => f?.type === "eligible").map((f) => String(f.name))
}

function experienceOf(jd: any, tags: string[]): { experience: string | null; min: number | null } {
  const min = typeof jd?.min_experience === "number" ? jd.min_experience : null
  const max = typeof jd?.max_experience === "number" ? jd.max_experience : null
  if (min !== null || max !== null) return { experience: expRange(min, max), min: min ?? 0 }
  if (tags.some((t) => /fresher|student|graduate/i.test(t))) return { experience: `Fresher (${tags.join(", ")})`, min: 0 }
  // Tagged for experienced professionals only: no year count, but not a fresher
  // role either, so -e 0 drops it.
  if (tags.length && tags.every((t) => /experienced/i.test(t))) return { experience: "Experienced (years not stated)", min: 1 }
  return { experience: tags.length ? tags.join(", ") : null, min: null }
}

function salaryOf(jd: any): string | null {
  if (!jd || jd.not_disclosed || !jd.show_salary) return null
  const factor = jd.pay_in === "monthly" ? 12 : 1
  return salaryRange((jd.min_salary || 0) * factor, (jd.max_salary || 0) * factor)
}

function locationsOf(locs: any[] | undefined, jd: any): string | null {
  const cities = (locs ?? []).map((l) => l?.city).filter(Boolean)
  const list = cities.length ? cities : jd?.locations ?? []
  const s = [...new Set(list.map(String))].join(", ")
  if (jd?.type === "work_from_home" || jd?.type === "remote") return s ? `${s} (Remote)` : "Remote"
  return s || null
}

function toJob(o: any): Job {
  const tags = eligibility(o.filters)
  const { experience, min } = experienceOf(o.jobDetail, tags)
  return {
    id: String(o.id),
    title: clean(o.title) || "(untitled)",
    company: clean(o.organisation?.name) || null,
    location: locationsOf(o.locations, o.jobDetail),
    date: isoDate(o.approved_date?.replace(/ GMT.*/, "") || o.regnRequirements?.start_regn_dt || o.updated_at),
    url: o.seo_url || `https://unstop.com/${o.public_url}`,
    experience,
    minExperience: min,
    salary: salaryOf(o.jobDetail),
    skills: (o.required_skills ?? []).map((s: any) => String(s.skill_name || s.skill)).filter(Boolean),
  }
}

async function search(p: SearchParams): Promise<Job[]> {
  const params = new URLSearchParams({
    opportunity: "jobs",
    oppstatus: "open",
    per_page: String(PAGE_SIZE),
    page: String(p.page),
  })
  if (p.query) params.set("searchTerm", p.query)
  const data = await fetchJSON<any>(`${API}/opportunity/search-result?${params}`, UA)
  return (data?.data?.data ?? []).map(toJob)
}

function parseRef(input: string): string | null {
  const t = input.trim()
  if (/^\d{5,}$/.test(t)) return t
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`)
    if (!/(^|\.)unstop\.com$/i.test(u.hostname)) return null
    const m = u.pathname.match(/^\/(?:jobs|o|competitions|internships)\/[^/]*?-?(\d{5,})\/?$/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

async function detail(id: string): Promise<JobDetail | null> {
  const data = await fetchJSON<any>(`${API}/competition/${id}`, UA)
  const c = data?.data?.competition
  if (!c) return null
  const tags = eligibility(c.filters)
  const jd = c.job_detail ?? c.jobDetail
  const { experience, min } = experienceOf(jd, tags)
  const url = c.seo_url || `https://unstop.com/${c.public_url}`
  return {
    id,
    title: clean(c.title) || "(untitled)",
    company: clean(c.organisation?.name) || null,
    location: locationsOf(c.locations, jd),
    date: isoDate(c.start_date),
    url,
    experience,
    minExperience: min,
    salary: salaryOf(jd),
    skills: (c.required_skills ?? []).map((s: any) => String(s.skill_name || s.skill)).filter(Boolean),
    description: htmlToText(c.details),
    deadline: isoDate(c.end_date),
    employmentType: jd?.timing ? String(jd.timing).replace(/_/g, " ") : null,
    applyUrl: url,
    isActive: String(c.regn_open) === "1" && (!c.end_date || new Date(c.end_date).getTime() >= Date.now()),
  }
}

export const PORTAL = {
  name: "unstop",
  help: HELP,
  requiresQuery: false,
  serverLocation: false,
  search,
  parseRef,
  detail,
}
