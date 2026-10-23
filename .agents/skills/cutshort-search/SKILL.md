---
name: cutshort-search
version: 1.0.0
description: >
  Use this skill to search Cutshort (cutshort.io) for jobs in India: India's tech-hiring network for startups and product companies, with salary ranges and experience ranges on most postings.
  Invoke it when the user wants Indian job listings, fresher or entry-level roles, or the full
  text of a Cutshort posting. Trigger phrases: cutshort, startup jobs india, tech jobs bangalore, backend developer jobs, java jobs bangalore, python jobs india, remote jobs india, spring boot jobs, software engineer jobs india.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/cutshort-search/cli/src/cli.ts *)
---

# Cutshort Search Skill (India)

Searches India's tech-hiring network for startups and product companies, with salary ranges and experience ranges on most postings. Public pages and APIs only: no login, no API key, zero runtime dependencies (just `bun`).

## Personal use only

Keep volume low: a few searches per `/scrape` run, not a crawl. `robots.txt` permits these paths (checked with `tools/robots_check.py`, 2026-10-23); the portal's own terms still apply, so use it for your own job search, not commercial or bulk collection.

## Commands

### Search

```bash
bun run .agents/skills/cutshort-search/cli/src/cli.ts search -q "<keywords>" [flags]
```

| Flag | Meaning |
|---|---|
| `--query`, `-q <text>` | Keywords. **Required.** |
| `--experience`, `-e <years>` | Your years of experience (`0` for a fresher): client-side from each job's stated range. |
| `--location`, `-l <city>` | City or `remote`: server-side via the city hub page. |
| `--jobage <days>` | Posted within N days: not available on hub pages; `detail` shows the posting date. |
| `--page <n>` | 1-indexed page. |
| `--limit`, `-n <n>` | Cap results emitted. |
| `--format json\|table\|plain` | Default `json`. |

Unknown flags exit 1 with a JSON error; they are never silently ignored.

### Detail

```bash
bun run .agents/skills/cutshort-search/cli/src/cli.ts detail <id|url> --format plain
```

Returns the full description, experience, salary (as ₹ LPA where the portal shows it), posting date, apply-by date and status.

## Examples

```bash
bun run .agents/skills/cutshort-search/cli/src/cli.ts search -q "backend developer" -e 1 --format table
bun run .agents/skills/cutshort-search/cli/src/cli.ts search -q java -l bangalore -e 0 --format plain
bun run .agents/skills/cutshort-search/cli/src/cli.ts search -q "spring boot" -l remote --format table
bun run .agents/skills/cutshort-search/cli/src/cli.ts detail https://cutshort.io/job/<slug> --format plain
```

## Output

`search --format json` prints `{ "meta": { "count", "page", "portal" }, "results": [...] }`. Every result has `id`, `title`, `company`, `location`, `date`, `url`, `experience`, `minExperience`, `salary`, `skills` (`null` / `[]` when the portal does not say). Errors go to stderr as `{ "error", "code" }` with exit code 1.

## Notes

- Applying needs a Cutshort login; the CLI reads public pages only.
- Some postings are by recruiters for an unnamed client ("A leading provider of ..."): the India fraud/agency gate in `04-job-evaluation.md` applies.
- Endpoints and parsing anchors: `url-reference.md` (update it when the portal changes its markup).
- Live smoke test: `cd .agents/skills/cutshort-search/cli && PORTAL_LIVE_TESTS=1 bun test tests/live.test.ts`.
