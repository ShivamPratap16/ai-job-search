---
name: unstop-search
version: 1.0.0
description: >
  Use this skill to search Unstop (unstop.com) for jobs in India: India's campus-hiring platform (formerly Dare2Compete): fresher drives, hiring challenges and jobs from product companies, startups and banks.
  Invoke it when the user wants Indian job listings, fresher or entry-level roles, or the full
  text of a Unstop posting. Trigger phrases: unstop, dare2compete, campus hiring india, fresher hiring drive, hiring challenge, off campus drive 2026, graduate engineer trainee, campus jobs, fresher software engineer india.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/unstop-search/cli/src/cli.ts *)
---

# Unstop Search Skill (India)

Searches India's campus-hiring platform (formerly Dare2Compete): fresher drives, hiring challenges and jobs from product companies, startups and banks. Public pages and APIs only: no login, no API key, zero runtime dependencies (just `bun`).

## Personal use only

Keep volume low: a few searches per `/scrape` run, not a crawl. `robots.txt` permits these paths (checked with `tools/robots_check.py`, 2026-10-23); the portal's own terms still apply, so use it for your own job search, not commercial or bulk collection.

## Commands

### Search

```bash
bun run .agents/skills/unstop-search/cli/src/cli.ts search [-q "<keywords>"] [flags]
```

| Flag | Meaning |
|---|---|
| `--query`, `-q <text>` | Keywords (optional). |
| `--experience`, `-e <years>` | Your years of experience (`0` for a fresher): client-side; fresher-tagged jobs count as 0 years, experienced-only tags as 1+. |
| `--location`, `-l <city>` | City or `remote`: client-side. |
| `--jobage <days>` | Posted within N days: client-side from the approval/opening date. |
| `--page <n>` | 1-indexed page. |
| `--limit`, `-n <n>` | Cap results emitted. |
| `--format json\|table\|plain` | Default `json`. |

Unknown flags exit 1 with a JSON error; they are never silently ignored.

### Detail

```bash
bun run .agents/skills/unstop-search/cli/src/cli.ts detail <id|url> --format plain
```

Returns the full description, experience, salary (as ₹ LPA where the portal shows it), posting date, apply-by date and status.

## Examples

```bash
bun run .agents/skills/unstop-search/cli/src/cli.ts search -q "software engineer" -e 0 --format table
bun run .agents/skills/unstop-search/cli/src/cli.ts search -q backend -l Bangalore --format plain
bun run .agents/skills/unstop-search/cli/src/cli.ts search --jobage 7 --format table
bun run .agents/skills/unstop-search/cli/src/cli.ts detail 1773319 --format plain
```

## Output

`search --format json` prints `{ "meta": { "count", "page", "portal" }, "results": [...] }`. Every result has `id`, `title`, `company`, `location`, `date`, `url`, `experience`, `minExperience`, `salary`, `skills` (`null` / `[]` when the portal does not say). Errors go to stderr as `{ "error", "code" }` with exit code 1.

## Notes

- Many Unstop jobs apply through a registration form or a hiring challenge (a test round) on Unstop itself.
- Salary is shown only when the employer enables it.
- Endpoints and parsing anchors: `url-reference.md` (update it when the portal changes its markup).
- Live smoke test: `cd .agents/skills/unstop-search/cli && PORTAL_LIVE_TESTS=1 bun test tests/live.test.ts`.
