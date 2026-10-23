// Shared plumbing for the India portal CLIs (instahyre, internshala, unstop,
// cutshort, hirist, ats). Each CLI ships an identical copy of this file so every
// skill stays self-contained with zero runtime dependencies; portal-specific
// endpoints and parsing live in portal.ts next to it.

export interface Job {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null // ISO date (YYYY-MM-DD) when the portal exposes one
  url: string
  experience: string | null // e.g. "0-2 yrs", as stated by the portal
  minExperience: number | null // years; used by --experience
  salary: string | null // human-readable, e.g. "₹5-8 LPA"
  skills: string[]
}

export interface JobDetail extends Job {
  description: string | null
  deadline: string | null
  employmentType: string | null
  applyUrl: string | null
  isActive: boolean
}

export interface SearchParams {
  query: string
  location?: string
  experience?: number
  jobage?: number
  page: number
  extra?: Record<string, string> // portal-specific flags (PORTAL.extraFlags)
}

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

/** Fetch with exponential backoff + jitter on 429/5xx. Returns "" on a 404. */
export async function fetchText(
  url: string,
  ua: string,
  accept = "text/html,application/json;q=0.9,*/*;q=0.8",
): Promise<string> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: { "User-Agent": ua, Accept: accept, "Accept-Language": "en-IN,en;q=0.9" },
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return ""
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return response.text()
  }
  throw new Error("Request failed after max retries")
}

export async function fetchJSON<T = any>(url: string, ua: string): Promise<T | null> {
  const text = await fetchText(url, ua, "application/json")
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Expected JSON from ${new URL(url).hostname}, got something else`)
  }
}

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

export function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;|&lsquo;/g, "'")
    .replace(/&rdquo;|&ldquo;/g, '"')
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&bull;/g, "•")
    .replace(/&rupee;|&#8377;/g, "₹")
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
    .replace(/&amp;/g, "&")
}

/** One line of text: tags stripped, entities decoded, whitespace collapsed. */
export function clean(html: string | null | undefined): string {
  if (!html) return ""
  return decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()
}

/** Multi-line text from rich HTML, keeping paragraph and list breaks. */
export function htmlToText(html: string | null | undefined): string | null {
  if (!html) return null
  const withBreaks = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/\s+/g, " ")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/(p|li|ul|ol|div|h\d|tr)>/gi, "\n")
  const text = withBreaks
    .split("\n")
    .map((l) => clean(l))
    .join("\n")
    .replace(/\n\s*\n• /g, "\n• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  return text || null
}

/** Format an INR amount per year as LPA ("₹5.5 LPA"). */
export function lpa(amount: number | null | undefined): string | null {
  if (!amount || !Number.isFinite(amount) || amount <= 0) return null
  const v = amount / 100000
  return `₹${Number.isInteger(v) ? v : v.toFixed(1)} LPA`
}

export function salaryRange(min?: number | null, max?: number | null): string | null {
  const a = lpa(min ?? null)
  const b = lpa(max ?? null)
  if (a && b && a !== b) return `${a.replace(" LPA", "")}-${b.replace("₹", "")}`
  return a || b
}

export function expRange(min?: number | null, max?: number | null): string | null {
  const hasMin = typeof min === "number" && Number.isFinite(min)
  const hasMax = typeof max === "number" && Number.isFinite(max)
  if (hasMin && hasMax) return min === max ? `${min} yrs` : `${min}-${max} yrs`
  if (hasMin) return `${min}+ yrs`
  if (hasMax) return `0-${max} yrs`
  return null
}

/** ISO date (YYYY-MM-DD) from an epoch-ms number or a parseable date string. */
export function isoDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null
  const d = typeof v === "number" ? new Date(v) : new Date(String(v))
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

/** "3 weeks ago" / "Today" / "Just now" → ISO date, relative to now. */
export function relativeToIso(text: string | null | undefined, now = new Date()): string | null {
  if (!text) return null
  const t = text.toLowerCase().trim()
  if (/just now|today|few hours|hour|minute/.test(t)) return now.toISOString().slice(0, 10)
  if (/yesterday/.test(t)) return new Date(now.getTime() - 86400000).toISOString().slice(0, 10)
  const m = t.match(/(\d+)\+?\s*(day|week|month|year)s?\s*ago/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  const days = { day: 1, week: 7, month: 30, year: 365 }[m[2] as "day" | "week" | "month" | "year"]
  return new Date(now.getTime() - n * days * 86400000).toISOString().slice(0, 10)
}

/** Client-side filters every portal shares: experience ceiling and posting age. */
export function applyFilters(jobs: Job[], p: SearchParams, now = new Date()): Job[] {
  return jobs.filter((j) => {
    if (p.experience !== undefined && j.minExperience !== null && j.minExperience > p.experience) {
      return false
    }
    if (p.jobage !== undefined && j.date) {
      const age = (now.getTime() - new Date(j.date).getTime()) / 86400000
      if (age > p.jobage + 1) return false
    }
    return true
  })
}

/** Extract every schema.org JobPosting object from a page's JSON-LD blocks. */
export function jsonLdJobPostings(html: string): any[] {
  const out: any[] = []
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    let data: any
    try {
      data = JSON.parse(m[1].trim())
    } catch {
      continue
    }
    const items = Array.isArray(data) ? data : data?.["@graph"] ?? [data]
    for (const it of items) if (it && it["@type"] === "JobPosting") out.push(it)
  }
  return out
}

export function renderTable(jobs: Job[]): string {
  if (jobs.length === 0) return "No results."
  const w = Math.min(Math.max(...jobs.map((j) => j.id.length), 2), 48)
  const header =
    "ID".padEnd(w) + " " + "TITLE".padEnd(40) + " " + "COMPANY".padEnd(24) + " " +
    "LOCATION".padEnd(18) + " " + "EXP".padEnd(10) + " DATE"
  const rows = jobs.map((j) =>
    [
      j.id.slice(0, w).padEnd(w),
      (j.title || "").slice(0, 40).padEnd(40),
      (j.company || "—").slice(0, 24).padEnd(24),
      (j.location || "—").slice(0, 18).padEnd(18),
      (j.experience || "—").slice(0, 10).padEnd(10),
      j.date || "—",
    ].join(" "),
  )
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export function renderPlain(jobs: Job[]): string {
  return jobs
    .map((j) => {
      const facts = [j.company || "—", j.location || "—", j.experience, j.salary, j.date]
        .filter(Boolean)
        .join(" · ")
      const skills = j.skills.length ? `\n  skills: ${j.skills.slice(0, 10).join(", ")}` : ""
      return `${j.title}\n  ${facts}${skills}\n  id: ${j.id}\n  ${j.url}`
    })
    .join("\n\n")
}

export function renderDetailPlain(d: JobDetail): string {
  const lines = [
    d.title,
    `${d.company || "—"} · ${d.location || "—"}`,
    "",
    d.experience ? `Experience: ${d.experience}` : "",
    d.salary ? `Salary: ${d.salary}` : "",
    d.employmentType ? `Employment: ${d.employmentType}` : "",
    d.date ? `Posted: ${d.date}` : "",
    d.deadline ? `Apply by: ${d.deadline}` : "",
    d.skills.length ? `Skills: ${d.skills.join(", ")}` : "",
    `Status: ${d.isActive ? "ACTIVE" : "CLOSED / EXPIRED"}`,
    "",
    d.description || "(no description)",
    "",
    `URL: ${d.url}`,
    d.applyUrl && d.applyUrl !== d.url ? `Apply: ${d.applyUrl}` : "",
  ].filter((l) => l !== "")
  return lines.join("\n")
}
