---
name: instahyre-search
version: 1.0.0
description: >
  Use this skill to search Instahyre (instahyre.com) for jobs in India: India's curated tech-hiring platform (product companies and startups; recruiters reach out to shortlisted candidates).
  Invoke it when the user wants Indian job listings, fresher or entry-level roles, or the full
  text of a Instahyre posting. Trigger phrases: instahyre, instahyre jobs, tech jobs india, software jobs bangalore, backend developer jobs india, java developer jobs, python developer jobs, sde jobs india, startup jobs india, fresher software jobs, naukri alternative.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/instahyre-search/cli/src/cli.ts *)
---

# Instahyre Search Skill (India)

Searches India's curated tech-hiring platform (product companies and startups; recruiters reach out to shortlisted candidates). Public pages and APIs only: no login, no API key, zero runtime dependencies (just `bun`).

## Personal use only

Keep volume low: a few searches per `/scrape` run, not a crawl. `robots.txt` permits these paths (checked with `tools/robots_check.py`, 2026-10-23); the portal's own terms still apply, so use it for your own job search, not commercial or bulk collection.

## Commands

### Search

```bash
bun run .agents/skills/instahyre-search/cli/src/cli.ts search -q "<keywords>" [flags]
```

| Flag | Meaning |
|---|---|
| `--query`, `-q <text>` | Keywords. **Required.** |
| `--experience`, `-e <years>` | Your years of experience (`0` for a fresher): server-side (`years`). |
| `--location`, `-l <city>` | City or `remote`: client-side (the API has no location parameter). |
| `--jobage <days>` | Posted within N days: not available on search (no posting dates in results); `detail` shows the posting date. |
| `--page <n>` | 1-indexed page. |
| `--limit`, `-n <n>` | Cap results emitted. |
| `--format json\|table\|plain` | Default `json`. |

Unknown flags exit 1 with a JSON error; they are never silently ignored.

### Detail

```bash
bun run .agents/skills/instahyre-search/cli/src/cli.ts detail <id|url> --format plain
```

Returns the full description, experience, salary (as ₹ LPA where the portal shows it), posting date, apply-by date and status.

## Examples

```bash
bun run .agents/skills/instahyre-search/cli/src/cli.ts search -q "Java" -e 0 --format table
bun run .agents/skills/instahyre-search/cli/src/cli.ts search -q "Backend Development" -e 1 -l Bangalore --format table
bun run .agents/skills/instahyre-search/cli/src/cli.ts search -q "Spring Boot" -e 0 --format plain
bun run .agents/skills/instahyre-search/cli/src/cli.ts detail 427995 --format plain
```

## Output

`search --format json` prints `{ "meta": { "count", "page", "portal" }, "results": [...] }`. Every result has `id`, `title`, `company`, `location`, `date`, `url`, `experience`, `minExperience`, `salary`, `skills` (`null` / `[]` when the portal does not say). Errors go to stderr as `{ "error", "code" }` with exit code 1.

## Notes

- Applying happens on Instahyre after login; the CLI only reads public listings.
- `--jobage` is accepted but cannot filter search results, which carry no date.
- Endpoints and parsing anchors: `url-reference.md` (update it when the portal changes its markup).
- Live smoke test: `cd .agents/skills/instahyre-search/cli && PORTAL_LIVE_TESTS=1 bun test tests/live.test.ts`.
