---
name: hirist-search
version: 1.0.0
description: >
  Use this skill to search Hirist (hirist.tech) for jobs in India: India's tech-only job board (IIMjobs group) with an experience range on every posting.
  Invoke it when the user wants Indian job listings, fresher or entry-level roles, or the full
  text of a Hirist posting. Trigger phrases: hirist, hirist.tech, iimjobs tech, tech jobs india, developer jobs india, backend jobs bangalore, java developer jobs, sde 1 jobs, software engineer 0-2 years india.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/hirist-search/cli/src/cli.ts *)
---

# Hirist Search Skill (India)

Searches India's tech-only job board (IIMjobs group) with an experience range on every posting. Public pages and APIs only: no login, no API key, zero runtime dependencies (just `bun`).

## Personal use only

Keep volume low: a few searches per `/scrape` run, not a crawl. `robots.txt` permits these paths (checked with `tools/robots_check.py`, 2026-10-23); the portal's own terms still apply, so use it for your own job search, not commercial or bulk collection.

## Commands

### Search

```bash
bun run .agents/skills/hirist-search/cli/src/cli.ts search -q "<keywords>" [flags]
```

| Flag | Meaning |
|---|---|
| `--query`, `-q <text>` | Keywords. **Required.** |
| `--experience`, `-e <years>` | Your years of experience (`0` for a fresher): server-side (`minexp`/`maxexp` window). |
| `--location`, `-l <city>` | City or `remote`: client-side. |
| `--jobage <days>` | Posted within N days: client-side from the posting date. |
| `--page <n>` | 1-indexed page. |
| `--limit`, `-n <n>` | Cap results emitted. |
| `--format json\|table\|plain` | Default `json`. |

Unknown flags exit 1 with a JSON error; they are never silently ignored.

### Detail

```bash
bun run .agents/skills/hirist-search/cli/src/cli.ts detail <id|url> --format plain
```

Returns the full description, experience, salary (as ₹ LPA where the portal shows it), posting date, apply-by date and status.

## Examples

```bash
bun run .agents/skills/hirist-search/cli/src/cli.ts search -q backend -e 1 --format table
bun run .agents/skills/hirist-search/cli/src/cli.ts search -q java -e 0 -l Bangalore --jobage 14 --format plain
bun run .agents/skills/hirist-search/cli/src/cli.ts search -q "python developer" -e 2 --format table
bun run .agents/skills/hirist-search/cli/src/cli.ts detail 1674308 --format plain
```

## Output

`search --format json` prints `{ "meta": { "count", "page", "portal" }, "results": [...] }`. Every result has `id`, `title`, `company`, `location`, `date`, `url`, `experience`, `minExperience`, `salary`, `skills` (`null` / `[]` when the portal does not say). Errors go to stderr as `{ "error", "code" }` with exit code 1.

## Notes

- Applying requires a Hirist login.
- Most salaries are hidden (`hideSal: 1`).
- Endpoints and parsing anchors: `url-reference.md` (update it when the portal changes its markup).
- Live smoke test: `cd .agents/skills/hirist-search/cli && PORTAL_LIVE_TESTS=1 bun test tests/live.test.ts`.
