import { PORTAL } from "../portal.js"
import { renderDetailPlain, writeError } from "../core.js"

export interface DetailOpts {
  input: string
  format: "json" | "plain"
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const ref = PORTAL.parseRef(opts.input)
  if (!ref) {
    writeError(`Could not parse a ${PORTAL.name} job id or URL from "${opts.input}"`, "BAD_ID")
    return 1
  }
  try {
    const job = await PORTAL.detail(ref)
    if (!job) {
      writeError("Job not found", "NOT_FOUND")
      return 1
    }
    process.stdout.write(
      (opts.format === "plain" ? renderDetailPlain(job) : JSON.stringify(job, null, 2)) + "\n",
    )
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
