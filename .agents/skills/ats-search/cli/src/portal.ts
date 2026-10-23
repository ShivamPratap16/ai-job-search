// Data source: the public job-board APIs of the four ATSs Indian product
// companies and global companies with Indian offices use most (JSON, no login):
//   Greenhouse       boards-api.greenhouse.io/v1/boards/<board>/jobs[/<id>]
//   Lever            api.lever.co/v0/postings/<company>?mode=json  (/<id> for one)
//   Ashby            api.ashbyhq.com/posting-api/job-board/<company>
//   SmartRecruiters  api.smartrecruiters.com/v1/companies/<company>/postings[/<id>]
// Which companies are checked is data, not code: companies.json next to the CLI.
// Search fans out over every listed board (8 at a time) and keeps India-located
// roles unless --location says otherwise.

import { readFileSync } from "fs"
import { join } from "path"
import {
  clean, fetchJSON, htmlToText, isoDate,
  type Job, type JobDetail, type SearchParams,
} from "./core.js"

const UA = "Mozilla/5.0 (compatible; ats-search-cli/1.0)"
type Ats = "greenhouse" | "lever" | "ashby" | "smartrecruiters"
interface Company { name: string; ats: Ats; slug: string }

export const HELP = `ats-cli — search company career boards (Greenhouse, Lever, Ashby, SmartRecruiters)
for roles in India

USAGE
  bun run src/cli.ts search [-q "<keywords>"] [flags]
  bun run src/cli.ts detail <id|url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>       Keywords matched against the job title (all words must appear),
                           e.g. "backend", "software engineer", "sde". Optional.
  --location, -l <text>    Location filter. Default: any Indian city or "India" / "Remote - India".
                           Use e.g. Bangalore, Pune, Remote.
  --experience, -e <yrs>   Your years of experience. Drops titles that signal seniority
                           (Senior, Staff, Lead, Principal, Manager, Architect, II/III, SDE-2...)
                           when 0-2; job descriptions are only read by 'detail'.
  --jobage <days>          Keep jobs published/updated within N days.
  --company <slugs>        Comma list of board slugs from companies.json (default: all).
  --page <n>               1-indexed page over the merged results (50/page). Default 1.
  --limit, -n <n>          Cap results emitted.
  --format <fmt>           json (default) | table | plain.

EXAMPLES
  bun run src/cli.ts search -q engineer -e 0 --jobage 14 --format table
  bun run src/cli.ts search -q backend -l Bangalore --format table
  bun run src/cli.ts search --company stripe,databricks -q software --format plain
  bun run src/cli.ts detail greenhouse:stripe:8185012 --format plain
  bun run src/cli.ts detail https://jobs.lever.co/paytm/<uuid> --format plain
`

const PAGE_SIZE = 50
const INDIA = /india|bengaluru|bangalore|mumbai|pune|hyderabad|delhi|gurgaon|gurugram|noida|chennai|kolkata|ahmedabad|jaipur|indore|kochi|chandigarh|coimbatore|trivandrum|thiruvananthapuram|mohali|nagpur|lucknow|bhubaneswar/i
const SENIOR = /\b(senior|sr\.?|staff|lead|principal|manager|head|director|architect|vp|chief|ii|iii|iv|sde[- ]?(2|3|ii|iii)|engineer[- ]?(2|3)|level[- ]?[3-9]|l[4-9])\b/i

export function loadCompanies(dir = import.meta.dir): Company[] {
  const file = join(dir, "..", "companies.json")
  const data = JSON.parse(readFileSync(file, "utf8"))
  return (data.companies ?? []) as Company[]
}

async function boardJobs(c: Company): Promise<Job[]> {
  const mk = (id: string, title: string, location: string, date: unknown, url: string): Job => ({
    id: `${c.ats}:${c.slug}:${id}`,
    title: clean(title) || "(untitled)",
    company: c.name,
    location: clean(location) || null,
    date: isoDate(date),
    url: url,
    experience: SENIOR.test(title) ? "senior title" : null,
    minExperience: SENIOR.test(title) ? 3 : null,
    salary: null,
    skills: [],
  })
  if (c.ats === "greenhouse") {
    const d = await fetchJSON<any>(`https://boards-api.greenhouse.io/v1/boards/${c.slug}/jobs`, UA)
    return (d?.jobs ?? []).map((j: any) => mk(String(j.id), j.title, j.location?.name ?? "", j.first_published ?? j.updated_at, j.absolute_url))
  }
  if (c.ats === "lever") {
    const d = await fetchJSON<any[]>(`https://api.lever.co/v0/postings/${c.slug}?mode=json`, UA)
    return (d ?? []).map((j: any) =>
      mk(j.id, j.text, (j.categories?.allLocations ?? [j.categories?.location]).filter(Boolean).join(", "), j.createdAt, j.hostedUrl),
    )
  }
  if (c.ats === "ashby") {
    const d = await fetchJSON<any>(`https://api.ashbyhq.com/posting-api/job-board/${c.slug}`, UA)
    return (d?.jobs ?? []).map((j: any) => {
      const locs = [j.location, ...(j.secondaryLocations ?? []).map((s: any) => s.location)].filter(Boolean)
      return mk(j.id, j.title, [...new Set(locs)].join(", "), j.publishedAt, j.jobUrl)
    })
  }
  // SmartRecruiters pages at 100; large employers (Swiggy) list several hundred.
  const content: any[] = []
  for (let offset = 0; offset < 1000; offset += 100) {
    const d = await fetchJSON<any>(
      `https://api.smartrecruiters.com/v1/companies/${c.slug}/postings?country=in&limit=100&offset=${offset}`, UA,
    )
    content.push(...(d?.content ?? []))
    if (!d || offset + 100 >= (d.totalFound ?? 0)) break
  }
  return content.map((j: any) => {
    const l = j.location ?? {}
    const loc = [l.city, l.region, l.country === "in" ? "India" : l.country, l.remote ? "Remote" : ""].filter(Boolean).join(", ")
    return mk(String(j.id), j.name, loc, j.releasedDate, `https://jobs.smartrecruiters.com/${j.company?.identifier ?? c.slug}/${j.id}`)
  })
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const k = i++
      out[k] = await fn(items[k])
    }
  }))
  return out
}

async function search(p: SearchParams): Promise<Job[]> {
  let companies = loadCompanies()
  if (p.extra?.company) {
    const want = p.extra.company.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    const unknown = want.filter((w) => !companies.some((c) => c.slug.toLowerCase() === w))
    if (unknown.length) throw new Error(`not in companies.json: ${unknown.join(", ")}`)
    companies = companies.filter((c) => want.includes(c.slug.toLowerCase()))
  }
  // One board failing (renamed slug, outage) must not sink the whole search.
  const failures: string[] = []
  const lists = await pool(companies, 8, (c) => boardJobs(c).catch(() => { failures.push(c.slug); return [] as Job[] }))
  if (failures.length) process.stderr.write(JSON.stringify({ warning: `boards unreachable: ${failures.join(", ")}`, code: "PARTIAL" }) + "\n")

  const words = p.query.toLowerCase().split(/\s+/).filter(Boolean)
  const loc = p.location?.toLowerCase()
  let jobs = lists.flat().filter((j) => {
    const t = j.title.toLowerCase()
    if (!words.every((w) => t.includes(w))) return false
    const where = (j.location || "").toLowerCase()
    if (!loc) return INDIA.test(where)
    if (/remote|wfh|work from home/.test(loc)) return /remote/.test(where) && (INDIA.test(where) || !/,/.test(where))
    const alias: Record<string, string> = { bengaluru: "bangalore", bangalore: "bengaluru", gurgaon: "gurugram", gurugram: "gurgaon" }
    return where.includes(loc) || (alias[loc] !== undefined && where.includes(alias[loc]))
  })
  if (p.experience !== undefined && p.experience > 2) {
    jobs = jobs.map((j) => ({ ...j, minExperience: null }))
  }
  jobs.sort((a, b) => (b.date || "").localeCompare(a.date || ""))
  return jobs.slice((p.page - 1) * PAGE_SIZE, p.page * PAGE_SIZE)
}

function parseRef(input: string): string | null {
  const t = input.trim()
  if (/^(greenhouse|lever|ashby|smartrecruiters):[A-Za-z0-9._-]+:[A-Za-z0-9-]+$/.test(t)) return t
  let u: URL
  try {
    u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`)
  } catch {
    return null
  }
  const h = u.hostname.toLowerCase()
  const seg = u.pathname.split("/").filter(Boolean)
  if (/(^|\.)greenhouse\.io$/.test(h)) {
    const i = seg.indexOf("jobs")
    if (i > 0 && seg[i + 1]) return `greenhouse:${seg[i - 1]}:${seg[i + 1]}`
    const jid = u.searchParams.get("gh_jid"), board = u.searchParams.get("for")
    return jid && board ? `greenhouse:${board}:${jid}` : null
  }
  if (h === "jobs.lever.co" && seg.length >= 2) return `lever:${seg[0]}:${seg[1]}`
  if (h === "jobs.ashbyhq.com" && seg.length >= 2) return `ashby:${seg[0]}:${seg[1]}`
  if (h === "jobs.smartrecruiters.com" && seg.length >= 2) return `smartrecruiters:${seg[0]}:${seg[1].split("-")[0]}`
  // A company-hosted Greenhouse page (stripe.com/jobs/search?gh_jid=...): map the
  // host to a board in companies.json.
  const jid = u.searchParams.get("gh_jid")
  if (jid) {
    const c = loadCompanies().find((c) => c.ats === "greenhouse" && h.replace(/^www\.|^careers\./, "").startsWith(c.slug))
    if (c) return `greenhouse:${c.slug}:${jid}`
  }
  return null
}

/** Lowest "N years" / "N+ years" the description asks for, if it says. */
export function minYears(text: string | null): number | null {
  if (!text) return null
  const re = /(\d{1,2})\s*(?:\+|\s*-\s*\d{1,2}|\s*to\s*\d{1,2})?\s*\+?\s*(?:years?|yrs?)\b/gi
  const vals: number[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const v = parseInt(m[1], 10)
    if (v <= 20) vals.push(v)
  }
  return vals.length ? Math.min(...vals) : null
}

async function detail(ref: string): Promise<JobDetail | null> {
  const [ats, slug, id] = ref.split(":") as [Ats, string, string]
  const company = loadCompanies().find((c) => c.ats === ats && c.slug === slug)?.name ?? slug
  let title = "", location = "", date: unknown = null, url = "", html = "", applyUrl: string | null = null, type: string | null = null
  if (ats === "greenhouse") {
    const j = await fetchJSON<any>(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs/${id}`, UA)
    if (!j) return null
    title = j.title; location = j.location?.name ?? ""; date = j.first_published ?? j.updated_at; url = j.absolute_url
    html = clean(j.content) ? decodeTwice(j.content) : ""
  } else if (ats === "lever") {
    const j = await fetchJSON<any>(`https://api.lever.co/v0/postings/${slug}/${id}`, UA)
    if (!j) return null
    title = j.text; location = (j.categories?.allLocations ?? [j.categories?.location]).filter(Boolean).join(", ")
    date = j.createdAt; url = j.hostedUrl; applyUrl = j.applyUrl ?? null; type = j.categories?.commitment ?? null
    html = [j.description, ...(j.lists ?? []).map((l: any) => `<h3>${l.text}</h3><ul>${l.content}</ul>`), j.additional].filter(Boolean).join("")
  } else if (ats === "ashby") {
    const d = await fetchJSON<any>(`https://api.ashbyhq.com/posting-api/job-board/${slug}`, UA)
    const j = (d?.jobs ?? []).find((x: any) => x.id === id)
    if (!j) return null
    title = j.title; location = j.location ?? ""; date = j.publishedAt; url = j.jobUrl; applyUrl = j.applyUrl ?? null
    type = j.employmentType ?? null; html = j.descriptionHtml ?? ""
  } else {
    const j = await fetchJSON<any>(`https://api.smartrecruiters.com/v1/companies/${slug}/postings/${id}`, UA)
    if (!j) return null
    const s = j.jobAd?.sections ?? {}
    title = j.name; location = [j.location?.city, j.location?.region].filter(Boolean).join(", "); date = j.releasedDate
    url = j.postingUrl ?? `https://jobs.smartrecruiters.com/${slug}/${id}`; applyUrl = j.applyUrl ?? null
    type = j.typeOfEmployment?.label ?? null
    html = ["companyDescription", "jobDescription", "qualifications", "additionalInformation"]
      .map((k) => s[k] && `<h3>${s[k].title ?? ""}</h3>${s[k].text ?? ""}`).filter(Boolean).join("")
  }
  const description = htmlToText(html)
  const min = minYears(description)
  return {
    id: ref, title: clean(title) || "(untitled)", company, location: clean(location) || null,
    date: isoDate(date), url, experience: min !== null ? `${min}+ yrs (from description)` : null,
    minExperience: min, salary: null, skills: [], description, deadline: null,
    employmentType: type, applyUrl: applyUrl ?? url, isActive: true,
  }
}

// Greenhouse returns job content HTML-escaped ("&lt;p&gt;").
function decodeTwice(s: string): string {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
}

export const PORTAL = {
  name: "ats",
  help: HELP,
  requiresQuery: false,
  serverLocation: true,
  extraFlags: ["company"],
  search,
  parseRef,
  detail,
}
