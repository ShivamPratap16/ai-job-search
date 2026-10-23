// Data source: Cutshort's public job hub pages (Next.js; the job list ships in
// the page's __NEXT_DATA__ react-query state) and public job pages, which carry
// schema.org JobPosting JSON-LD. Hub URLs are SEO paths:
//   /jobs/<query>-jobs[-in-<city>]?page=<n>
// e.g. /jobs/backend-developer-jobs, /jobs/java-jobs-in-bangalore-bengaluru.

import {
  clean, expRange, fetchText, htmlToText, isoDate, jsonLdJobPostings, salaryRange,
  type Job, type JobDetail, type SearchParams,
} from "./core.js"

const UA = "Mozilla/5.0 (compatible; cutshort-search-cli/1.0)"
const BASE = "https://cutshort.io"

export const HELP = `cutshort-cli — search tech jobs on Cutshort (India; startups and product companies)

USAGE
  bun run src/cli.ts search -q "<role or skill>" [flags]
  bun run src/cli.ts detail <url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>       Role or skill, e.g. "backend developer", "java", "python",
                           "spring boot", "software engineer". REQUIRED.
  --location, -l <city>    City, e.g. Bangalore, Pune, Mumbai, Hyderabad, "remote".
                           Server-side via the city hub page.
  --experience, -e <yrs>   Your years of experience; drops jobs whose minimum is higher.
  --jobage <days>          Accepted for contract parity; hub pages carry no posting date,
                           so it filters nothing on search (detail shows the date).
  --page <n>               1-indexed page (50 results/page). Default 1.
  --limit, -n <n>          Cap results emitted.
  --format <fmt>           json (default) | table | plain.

EXAMPLES
  bun run src/cli.ts search -q "backend developer" -e 1 --format table
  bun run src/cli.ts search -q java -l bangalore -e 0 --format plain
  bun run src/cli.ts detail https://cutshort.io/job/<slug> --format plain
`

function slug(s: string): string {
  return s.toLowerCase().replace(/\+/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

// Cutshort's city hubs use compound slugs for some cities.
const CITY: Record<string, string> = {
  bangalore: "bangalore-bengaluru",
  bengaluru: "bangalore-bengaluru",
  gurgaon: "gurugram",
  delhi: "delhi-ncr-gurgaon-and-noida",
  noida: "noida",
  mumbai: "mumbai",
  pune: "pune",
  hyderabad: "hyderabad",
  chennai: "chennai",
}

function hubUrl(p: SearchParams): string {
  const loc = p.location ? p.location.toLowerCase().trim() : ""
  const where = !loc ? "" : /remote|wfh|work from home/.test(loc) ? "-remote" : `-in-${CITY[loc] ?? slug(loc)}`
  const qs = p.page > 1 ? `?page=${p.page}` : ""
  return `${BASE}/jobs/${slug(p.query)}-jobs${where}${qs}`
}

function nextData(html: string): any {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!m) return null
  try {
    return JSON.parse(m[1])
  } catch {
    return null
  }
}

export function parseHub(html: string): Job[] {
  const queries = nextData(html)?.props?.pageProps?.dehydratedState?.queries ?? []
  const list = queries.find((q: any) => q?.queryKey?.[0] === "jobListData")
  const jobs: any[] = list?.state?.data?.data?.pageData?.jobs ?? []
  return jobs.map((j) => {
    const min = typeof j.expRange?.min === "number" ? j.expRange.min : null
    const max = typeof j.expRange?.max === "number" ? j.expRange.max : null
    const sal = j.salaryRange
    const remote = j.remoteType && !/not_okay/.test(j.remoteType) ? " (Remote OK)" : ""
    return {
      id: String(j.publicUrl || "").split("-").pop() || String(j._id),
      title: clean(j.headline) || "(untitled)",
      company: clean(j.companyDetails?.name || j.companyId?.name) || null,
      location: (j.locationsText || (j.locations ?? []).join(", ") || null) && `${j.locationsText || (j.locations ?? []).join(", ")}${remote}`,
      date: null,
      url: j.publicUrl,
      experience: expRange(min, max),
      minExperience: min,
      salary: sal && sal.currency === "INR" && !sal.hideSalary ? salaryRange(sal.min, sal.max) : null,
      skills: Array.isArray(j.allSkills) ? j.allSkills.map(String) : [],
    } as Job
  }).filter((j) => j.url)
}

async function search(p: SearchParams): Promise<Job[]> {
  const html = await fetchText(hubUrl(p), UA)
  return html ? parseHub(html) : []
}

function parseRef(input: string): string | null {
  const t = input.trim()
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`)
    if (!/(^|\.)cutshort\.io$/i.test(u.hostname)) return null
    return /^\/job\/[A-Za-z0-9-]+\/?$/.test(u.pathname) ? u.pathname.replace(/\/$/, "") : null
  } catch {
    return null
  }
}

async function detail(path: string): Promise<JobDetail | null> {
  const html = await fetchText(`${BASE}${path}`, UA)
  if (!html) return null
  const jp = jsonLdJobPostings(html)[0]
  if (!jp) return null
  const months = jp.experienceRequirements?.monthsOfExperience
  const minYears = typeof months === "number" ? Math.floor(months / 12) : null
  const locs = [].concat(jp.jobLocation ?? []).map((l: any) => l?.address?.addressLocality).filter(Boolean)
  const bs = jp.baseSalary?.value
  return {
    id: path.split("-").pop() || path,
    title: clean(jp.title) || "(untitled)",
    company: clean(jp.hiringOrganization?.name) || null,
    location: locs.length ? [...new Set(locs)].join(", ") : null,
    date: isoDate(jp.datePosted),
    url: `${BASE}${path}`,
    experience: minYears !== null ? `${minYears}+ yrs` : null,
    minExperience: minYears,
    salary: jp.baseSalary?.currency === "INR" && bs ? salaryRange(bs.minValue, bs.maxValue) : null,
    skills: Array.isArray(jp.skills) ? jp.skills.map(String) : typeof jp.skills === "string" ? jp.skills.split(/,\s*/) : [],
    description: htmlToText(jp.description),
    deadline: isoDate(jp.validThrough),
    employmentType: jp.employmentType ? String(jp.employmentType) : null,
    applyUrl: `${BASE}${path}`,
    isActive: !jp.validThrough || new Date(jp.validThrough).getTime() >= Date.now(),
  }
}

export const PORTAL = {
  name: "cutshort",
  help: HELP,
  requiresQuery: true,
  serverLocation: true,
  search,
  parseRef,
  detail,
}
