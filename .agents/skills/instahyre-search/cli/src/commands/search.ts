import { PORTAL } from "../portal.js"
import { applyFilters, renderPlain, renderTable, writeError, type Job } from "../core.js"

export interface SearchOpts {
  query: string
  location?: string
  experience?: number
  jobage?: number
  page: number
  extra?: Record<string, string>
  limit?: number
  format: "json" | "table" | "plain"
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    let jobs: Job[] = await PORTAL.search(opts)
    jobs = applyFilters(jobs, opts)
    // Portals without a server-side location filter are narrowed here, so
    // --location is never silently ignored. "Remote" also matches WFH labels.
    if (opts.location && !PORTAL.serverLocation) {
      const want = opts.location.toLowerCase()
      const remote = /remote|wfh|work from home/.test(want)
      jobs = jobs.filter((j) => {
        const loc = (j.location || "").toLowerCase()
        return loc.includes(want) || (remote && /remote|wfh|work from home|anywhere/.test(loc)) ||
          (want === "bangalore" && loc.includes("bengaluru")) || (want === "bengaluru" && loc.includes("bangalore")) ||
          (want === "gurgaon" && loc.includes("gurugram")) || (want === "gurugram" && loc.includes("gurgaon"))
      })
    }
    if (opts.limit !== undefined) jobs = jobs.slice(0, opts.limit)

    if (opts.format === "table") process.stdout.write(renderTable(jobs) + "\n")
    else if (opts.format === "plain") process.stdout.write((renderPlain(jobs) || "No results.") + "\n")
    else
      process.stdout.write(
        JSON.stringify({ meta: { count: jobs.length, page: opts.page, portal: PORTAL.name }, results: jobs }, null, 2) + "\n",
      )
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
