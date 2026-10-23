// Data source: Internshala's public job listing pages (server-rendered HTML,
// no login). Search URLs are SEO paths built from the query and city:
//   /jobs/<query>-jobs-in-<city>/page-<n>/      (category/skill pages)
//   /fresher-jobs/<query>-jobs/                  (only "no experience" jobs)
//   /jobs/keywords-<query>/                      (free-text fallback)
// Detail pages (/job/detail/<slug>) are parsed from their HTML sections.

import {
  clean, fetchText, htmlToText, relativeToIso,
  type Job, type JobDetail, type SearchParams,
} from "./core.js"

const UA = "Mozilla/5.0 (compatible; internshala-search-cli/1.0)"
const BASE = "https://internshala.com"

export const HELP = `internshala-cli — search fresher and entry-level jobs on Internshala (India)

USAGE
  bun run src/cli.ts search -q "<role or skill>" [flags]
  bun run src/cli.ts detail <slug|url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>       Role or skill, e.g. "backend development", "java", "python",
                           "software development", "web development". REQUIRED.
  --location, -l <city>    City, e.g. Bangalore, Pune, Delhi, "work from home". Server-side.
  --experience, -e <yrs>   Your years of experience. 0 searches Internshala's fresher-only
                           listing; any value also drops jobs needing more than that.
  --jobage <days>          Keep jobs posted within N days (from "3 days ago" labels).
  --page <n>               1-indexed page (~40 results/page). Default 1.
  --limit, -n <n>          Cap results emitted.
  --format <fmt>           json (default) | table | plain.

EXAMPLES
  bun run src/cli.ts search -q "backend development" -e 0 --format table
  bun run src/cli.ts search -q "java" -l bangalore --jobage 7 --format table
  bun run src/cli.ts search -q "python" -l "work from home" -e 1 --format plain
  bun run src/cli.ts detail https://internshala.com/job/detail/<slug> --format plain
`

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function citySlug(loc: string): string {
  const l = loc.toLowerCase().trim()
  if (/remote|wfh|work from home/.test(l)) return "work-from-home"
  if (l === "bengaluru") return "bangalore"
  if (l === "gurugram") return "gurgaon"
  return slug(l)
}

function pageSuffix(page: number): string {
  return page > 1 ? `page-${page}/` : ""
}

function searchUrls(p: SearchParams): string[] {
  const q = slug(p.query)
  const loc = p.location ? `-in-${citySlug(p.location)}` : ""
  const root = p.experience === 0 ? "fresher-jobs" : "jobs"
  return [
    `${BASE}/${root}/${q}-jobs${loc}/${pageSuffix(p.page)}`,
    // Free-text fallback when the query is not one of Internshala's category slugs.
    `${BASE}/${root}/keywords-${encodeURIComponent(p.query.toLowerCase())}${loc ? `/${loc.slice(1)}` : ""}/${pageSuffix(p.page)}`,
  ]
}

function parseSalary(raw: string | null): string | null {
  if (!raw) return null
  const t = clean(raw)
  if (!/₹/.test(t)) return t || null
  const nums = (t.match(/[\d,]+/g) || []).map((n) => parseInt(n.replace(/,/g, ""), 10)).filter((n) => n > 0)
  if (!nums.length) return t
  const fmt = (n: number) => {
    const v = n / 100000
    return Number.isInteger(v) ? String(v) : v.toFixed(1)
  }
  return nums.length > 1 && nums[0] !== nums[1] ? `₹${fmt(nums[0])}-${fmt(nums[1])} LPA` : `₹${fmt(nums[0])} LPA`
}

function parseExperience(raw: string | null): { experience: string | null; min: number | null } {
  if (!raw) return { experience: null, min: null }
  const t = clean(raw)
  if (/no experience/i.test(t)) return { experience: "Fresher (0 yrs)", min: 0 }
  const m = t.match(/(\d+)/)
  return m ? { experience: `${m[1]}+ yrs`, min: parseInt(m[1], 10) } : { experience: t, min: null }
}

export function parseCards(html: string): Job[] {
  const jobs: Job[] = []
  const chunks = html.split(/<div class="container-fluid individual_internship/).slice(1)
  for (const chunk of chunks) {
    if (!/employment_type="job"/.test(chunk.slice(0, 600))) continue
    const id = chunk.match(/internshipId="(\d+)"/)?.[1]
    const href = chunk.match(/data-href='([^']+)'/)?.[1] ?? chunk.match(/class="job-title-href"[^>]*href="([^"]+)"/)?.[1]
    const title = clean(chunk.match(/class="job-title-href"[^>]*>([\s\S]*?)<\/a>/)?.[1])
    if (!id || !href || !title) continue
    const company = clean(chunk.match(/<p class="company-name">([\s\S]*?)<\/p>/)?.[1]) || null
    const locBlock = chunk.match(/<p class="row-1-item\s+locations">([\s\S]*?)<\/p>/)?.[1]
    const location = locBlock ? clean(locBlock).replace(/\s*,\s*/g, ", ") : null
    const salaryRaw = chunk.match(/ic-16-money"><\/i>\s*<span class="desktop">([\s\S]*?)<\/span>/)?.[1] ?? null
    const expRaw = chunk.match(/ic-16-briefcase"><\/i>\s*<span>([\s\S]*?)<\/span>/)?.[1] ?? null
    const posted = chunk.match(/class="status-[a-z]+"><i[^>]*><\/i><span>([^<]+)<\/span>/)?.[1] ?? null
    const skills = [...chunk.matchAll(/<div class='job_skill'>([^<]+)<\/div>/g)].map((m) => clean(m[1]))
    const { experience, min } = parseExperience(expRaw)
    jobs.push({
      id,
      title: title,
      company: company,
      location: location,
      date: relativeToIso(posted),
      url: `${BASE}${href}`,
      experience,
      minExperience: min,
      salary: parseSalary(salaryRaw),
      skills,
    })
  }
  return jobs
}

async function search(p: SearchParams): Promise<Job[]> {
  for (const url of searchUrls(p)) {
    const html = await fetchText(url, UA)
    const jobs = html ? parseCards(html) : []
    if (jobs.length) return jobs
  }
  return []
}

function parseRef(input: string): string | null {
  const t = input.trim()
  if (/^[a-z0-9-]+\d{6,}$/i.test(t)) return `/job/detail/${t}`
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`)
    if (!/(^|\.)internshala\.com$/i.test(u.hostname)) return null
    return /^\/job\/detail\/[a-z0-9-]+\/?$/i.test(u.pathname) ? u.pathname.replace(/\/$/, "") : null
  } catch {
    return null
  }
}

// Every titled section from "About the job" on (responsibilities, who can apply,
// salary incl. probation terms, perks, about the company), skipping the skill
// chips and opening counts that are reported as fields of their own.
function sections(html: string): string | null {
  const re = /<h[23][^>]*class="section_heading[^"]*"[^>]*>([\s\S]*?)<\/h[23]>/g
  const heads = [...html.matchAll(re)]
  const parts: string[] = []
  heads.forEach((h, i) => {
    const name = clean(h[1])
    if (/skill\(s\) required|number of openings|activity on internshala/i.test(name)) return
    const end = i + 1 < heads.length ? heads[i + 1].index! : Math.min(html.length, h.index! + 6000)
    const body = htmlToText(html.slice(h.index! + h[0].length, end).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ""))
    if (body) parts.push(`${name}:\n${body}`)
  })
  return parts.join("\n\n") || null
}

function section(html: string, label: RegExp): string | null {
  const i = html.search(label)
  if (i === -1) return null
  return html.slice(i, i + 1500).match(/class="item_body[^"]*">([\s\S]*?)<\/div>/)?.[1] ?? null
}

async function detail(path: string): Promise<JobDetail | null> {
  const html = await fetchText(`${BASE}${path}`, UA)
  if (!html) return null
  const title = clean(
    html.match(/<h1[^>]*class="[^"]*heading_2_4[^"]*"[^>]*>([\s\S]*?)<\/h1>/)?.[1] ??
      html.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.split("|")[0],
  )
  const company =
    clean(html.match(/class="link_display_like_text[^"]*"[^>]*>([\s\S]*?)<\/a>/)?.[1]) ||
    clean(html.match(/<div class="heading_6 company_name">([\s\S]*?)<\/div>/)?.[1]) ||
    null
  const locBlock = html.match(/<p id="location_names">([\s\S]*?)<\/p>/)?.[1]
  const descStart = html.search(/class="section_heading heading_5_5 about_heading">About the job<\/h2>/)
  const tail = descStart === -1 ? "" : html.slice(descStart)
  const stop = tail.search(/Activity on Internshala|Additional Questions|class="buttons_container/)
  const desc = descStart === -1 ? null : sections(stop === -1 ? tail : tail.slice(0, stop))
  const skillsStart = html.indexOf("Skill(s) required")
  const skills =
    skillsStart === -1
      ? []
      : [...html.slice(skillsStart, skillsStart + 3000).matchAll(/<span class="round_tabs">([^<]+)<\/span>/g)].map((m) => clean(m[1]))
  const expRaw = section(html, /ic-16-briefcase/)
  const { experience, min } = parseExperience(expRaw)
  const applyBy = clean(section(html, /Apply By<\/span>/)) || null
  const posted = html.match(/Posted ([^<]+)<\/div>/)?.[1] ?? null
  const closed = /no longer accepting applications|applications closed|this job is closed/i.test(html.slice(0, descStart === -1 ? html.length : descStart))
  return {
    id: path.match(/(\d{6,})$/)?.[1] ?? path,
    title: title || "(untitled)",
    company,
    location: locBlock ? clean(locBlock).replace(/\s*,\s*/g, ", ") : null,
    date: relativeToIso(posted),
    url: `${BASE}${path}`,
    experience,
    minExperience: min,
    salary: parseSalary(section(html, /CTC \(ANNUAL\)/)),
    skills,
    description: desc,
    deadline: applyBy,
    employmentType: "Full-time",
    applyUrl: `${BASE}${path}`,
    isActive: !closed,
  }
}

export const PORTAL = {
  name: "internshala",
  help: HELP,
  requiresQuery: true,
  serverLocation: true,
  search,
  parseRef,
  detail,
}
