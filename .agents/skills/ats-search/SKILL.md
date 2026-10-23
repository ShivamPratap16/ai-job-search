---
name: ats-search
version: 1.0.0
description: >
  Use this skill to search Company career boards (ATS) (Greenhouse, Lever, Ashby and SmartRecruiters) for jobs in India: the official career boards of product companies and global companies with Indian offices (Stripe, Databricks, Paytm, Meesho, Zeta, CRED, Groww, Sarvam, Freshworks and the rest of `cli/companies.json`).
  Invoke it when the user wants Indian job listings, fresher or entry-level roles, or the full
  text of a Company career boards (ATS) posting. Trigger phrases: company careers, career page, greenhouse jobs, lever jobs, ashby jobs, smartrecruiters, product company jobs india, stripe india jobs, paytm careers, meesho careers, official job posting, apply on company site.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/ats-search/cli/src/cli.ts *)
---

# Company career boards (ATS) Search Skill (India)

Searches the official career boards of product companies and global companies with Indian offices (Stripe, Databricks, Paytm, Meesho, Zeta, CRED, Groww, Sarvam, Freshworks and the rest of `cli/companies.json`). Public pages and APIs only: no login, no API key, zero runtime dependencies (just `bun`).

## Personal use only

Keep volume low: a few searches per `/scrape` run, not a crawl. `robots.txt` permits these paths (checked with `tools/robots_check.py`, 2026-10-23); the portal's own terms still apply, so use it for your own job search, not commercial or bulk collection.

## Commands

### Search

```bash
bun run .agents/skills/ats-search/cli/src/cli.ts search [-q "<keywords>"] [flags]
```

| Flag | Meaning |
|---|---|
| `--query`, `-q <text>` | Keywords (optional). |
| `--experience`, `-e <years>` | Your years of experience (`0` for a fresher): title-based: Senior/Staff/Lead/II/III titles are dropped for 0-2 years; `detail` reads the description's "N years". |
| `--location`, `-l <city>` | City or `remote`: default is any Indian location; `-l` narrows to a city or Remote. |
| `--jobage <days>` | Posted within N days: client-side from the publish date. |
| `--company <slugs>` | Comma list of board slugs from `cli/companies.json` (default: all). |
| `--page <n>` | 1-indexed page. |
| `--limit`, `-n <n>` | Cap results emitted. |
| `--format json\|table\|plain` | Default `json`. |

Unknown flags exit 1 with a JSON error; they are never silently ignored.

### Detail

```bash
bun run .agents/skills/ats-search/cli/src/cli.ts detail <id|url> --format plain
```

Returns the full description, experience, salary (as ₹ LPA where the portal shows it), posting date, apply-by date and status.

## Examples

```bash
bun run .agents/skills/ats-search/cli/src/cli.ts search -q engineer -e 0 --jobage 14 --format table
bun run .agents/skills/ats-search/cli/src/cli.ts search -q backend -l Bangalore --format table
bun run .agents/skills/ats-search/cli/src/cli.ts search --company stripe,databricks -q software --format plain
bun run .agents/skills/ats-search/cli/src/cli.ts detail greenhouse:stripe:8185012 --format plain
```

## Output

`search --format json` prints `{ "meta": { "count", "page", "portal" }, "results": [...] }`. Every result has `id`, `title`, `company`, `location`, `date`, `url`, `experience`, `minExperience`, `salary`, `skills` (`null` / `[]` when the portal does not say). Errors go to stderr as `{ "error", "code" }` with exit code 1.

## Notes

- One unreachable board prints a `PARTIAL` warning on stderr and the search continues.
- These are the employer's own postings: prefer them over aggregator copies of the same role (`/apply` Step 0).
- Endpoints and parsing anchors: `url-reference.md` (update it when the portal changes its markup).
- Live smoke test: `cd .agents/skills/ats-search/cli && PORTAL_LIVE_TESTS=1 bun test tests/live.test.ts`.
