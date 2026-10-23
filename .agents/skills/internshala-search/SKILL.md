---
name: internshala-search
version: 1.0.0
description: >
  Use this skill to search Internshala (internshala.com) for jobs in India: India's largest fresher job and internship board (entry-level roles at startups, SMEs and services firms, with salary and probation terms on every posting).
  Invoke it when the user wants Indian job listings, fresher or entry-level roles, or the full
  text of a Internshala posting. Trigger phrases: internshala, fresher jobs, fresher jobs india, entry level jobs india, jobs for freshers, 2026 batch jobs, graduate jobs india, junior developer jobs, java fresher jobs, python fresher jobs, backend fresher jobs, work from home jobs india.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/internshala-search/cli/src/cli.ts *)
---

# Internshala Search Skill (India)

Searches India's largest fresher job and internship board (entry-level roles at startups, SMEs and services firms, with salary and probation terms on every posting). Public pages and APIs only: no login, no API key, zero runtime dependencies (just `bun`).

## Personal use only

Keep volume low: a few searches per `/scrape` run, not a crawl. `robots.txt` permits these paths (checked with `tools/robots_check.py`, 2026-10-23); the portal's own terms still apply, so use it for your own job search, not commercial or bulk collection.

## Commands

### Search

```bash
bun run .agents/skills/internshala-search/cli/src/cli.ts search -q "<keywords>" [flags]
```

| Flag | Meaning |
|---|---|
| `--query`, `-q <text>` | Keywords. **Required.** |
| `--experience`, `-e <years>` | Your years of experience (`0` for a fresher): `-e 0` searches the fresher-only listing; any value also drops jobs needing more years. |
| `--location`, `-l <city>` | City or `remote`: server-side (city in the SEO path). |
| `--jobage <days>` | Posted within N days: client-side from the "3 days ago" labels. |
| `--page <n>` | 1-indexed page. |
| `--limit`, `-n <n>` | Cap results emitted. |
| `--format json\|table\|plain` | Default `json`. |

Unknown flags exit 1 with a JSON error; they are never silently ignored.

### Detail

```bash
bun run .agents/skills/internshala-search/cli/src/cli.ts detail <id|url> --format plain
```

Returns the full description, experience, salary (as ₹ LPA where the portal shows it), posting date, apply-by date and status.

## Examples

```bash
bun run .agents/skills/internshala-search/cli/src/cli.ts search -q "backend development" -e 0 --format table
bun run .agents/skills/internshala-search/cli/src/cli.ts search -q java -l bangalore --jobage 7 --format table
bun run .agents/skills/internshala-search/cli/src/cli.ts search -q python -l "work from home" -e 1 --format plain
bun run .agents/skills/internshala-search/cli/src/cli.ts detail https://internshala.com/job/detail/<slug> --format plain
```

## Output

`search --format json` prints `{ "meta": { "count", "page", "portal" }, "results": [...] }`. Every result has `id`, `title`, `company`, `location`, `date`, `url`, `experience`, `minExperience`, `salary`, `skills` (`null` / `[]` when the portal does not say). Errors go to stderr as `{ "error", "code" }` with exit code 1.

## Notes

- Internshala categories mix in non-tech roles (a `java` page can list teaching jobs); `/rank` filters those out.
- Probation terms ("3 months at ₹15,000/month") are in `detail`'s description: read them before applying.
- Endpoints and parsing anchors: `url-reference.md` (update it when the portal changes its markup).
- Live smoke test: `cd .agents/skills/internshala-search/cli && PORTAL_LIVE_TESTS=1 bun test tests/live.test.ts`.
