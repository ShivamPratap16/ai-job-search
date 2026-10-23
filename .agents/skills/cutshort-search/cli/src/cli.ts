#!/usr/bin/env bun
// Self-contained CLI for one India job portal. Argument parsing, validation and
// output are shared by every India portal CLI; the portal itself is described
// by ./portal.ts. Zero runtime dependencies - runs anywhere `bun` is available.

import { PORTAL } from "./portal.js"
import { runSearch } from "./commands/search.js"
import { runDetail } from "./commands/detail.js"
import { writeError } from "./core.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

export function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  const alias: Record<string, string> = { q: "query", l: "location", n: "limit", e: "experience" }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith("-") && a.length > 1 && !/^-\d/.test(a)) {
      const key = alias[a.replace(/^-+/, "")] ?? a.replace(/^-+/, "")
      const next = argv[i + 1]
      if (next === undefined || (next.startsWith("-") && !/^-\d/.test(next))) {
        flags[key] = true
      } else {
        flags[key] = next
        i++
      }
    } else {
      ;(flags._ as string[]).push(a)
    }
  }
  return flags
}

const SEARCH_FLAGS = ["query", "location", "experience", "jobage", "page", "limit", "format", "help", "h"]

function intFlag(flags: Flags, key: string, min: number): number | undefined | "bad" {
  const v = flags[key]
  if (v === undefined) return undefined
  if (typeof v !== "string" || !/^\d+$/.test(v) || parseInt(v, 10) < min) return "bad"
  return parseInt(v, 10)
}

async function main(): Promise<number> {
  const flags = parseFlags(process.argv.slice(2))
  const cmd = (flags._ as string[])[0]

  if (!cmd || flags.help || flags.h) {
    process.stdout.write(PORTAL.help)
    return cmd ? 0 : 1
  }

  const extraFlags: string[] = (PORTAL as { extraFlags?: string[] }).extraFlags ?? []
  const known: Record<string, Set<string>> = {
    search: new Set([...SEARCH_FLAGS, ...extraFlags]),
    detail: new Set(["format", "help", "h"]),
  }
  if (!known[cmd]) {
    writeError(`unknown command '${cmd}' - use 'search' or 'detail'`, "UNKNOWN_COMMAND")
    return 1
  }
  // Flags are never silently ignored: a discarded filter changes what the
  // search returns with no error (see add-portal.md's portal-skill contract).
  for (const key of Object.keys(flags)) {
    if (key === "_" || known[cmd].has(key)) continue
    writeError(
      `unknown flag --${key} for '${cmd}' - flags are never silently ignored, because a discarded filter changes what the search returns; see --help for the supported flags`,
      "UNKNOWN_FLAG",
    )
    return 1
  }

  const format = typeof flags.format === "string" ? flags.format : "json"

  if (cmd === "detail") {
    const input = (flags._ as string[])[1]
    if (!input) {
      writeError("detail needs a job id or URL", "NO_ID")
      return 1
    }
    if (format !== "json" && format !== "plain") {
      writeError("--format must be json or plain for detail", "BAD_FORMAT")
      return 1
    }
    return runDetail({ input, format })
  }

  if (flags.query !== undefined && (typeof flags.query !== "string" || !flags.query.trim())) {
    writeError("--query/-q needs keywords, e.g. -q \"backend developer\"", "EMPTY_QUERY")
    return 1
  }
  const query = typeof flags.query === "string" ? flags.query.trim() : ""
  if (!query && PORTAL.requiresQuery) {
    writeError("the --query/-q flag is required, e.g. -q \"java developer\"", "NO_QUERY")
    return 1
  }
  if (flags.location !== undefined && (typeof flags.location !== "string" || !flags.location.trim())) {
    writeError("--location/-l needs a city, e.g. -l Bangalore", "EMPTY_LOCATION")
    return 1
  }
  if (!["json", "table", "plain"].includes(format)) {
    writeError("--format must be json, table or plain", "BAD_FORMAT")
    return 1
  }
  const page = intFlag(flags, "page", 1)
  const limit = intFlag(flags, "limit", 0)
  const experience = intFlag(flags, "experience", 0)
  const jobage = intFlag(flags, "jobage", 1)
  for (const [k, v] of Object.entries({ page, limit, experience, jobage })) {
    if (v === "bad") {
      writeError(`--${k} must be a whole number${k === "page" || k === "jobage" ? " >= 1" : " >= 0"}`, "BAD_NUMBER")
      return 1
    }
  }

  const extra: Record<string, string> = {}
  for (const k of extraFlags) {
    const v = flags[k]
    if (v === undefined) continue
    if (typeof v !== "string" || !v.trim()) {
      writeError(`--${k} needs a value`, "BAD_ARG")
      return 1
    }
    extra[k] = v.trim()
  }

  return runSearch({
    query,
    extra,
    location: typeof flags.location === "string" ? flags.location.trim() : undefined,
    experience: experience as number | undefined,
    jobage: jobage as number | undefined,
    page: (page as number | undefined) ?? 1,
    limit: limit as number | undefined,
    format: format as "json" | "table" | "plain",
  })
}

if (import.meta.main) {
  main().then((code) => process.exit(code))
}
