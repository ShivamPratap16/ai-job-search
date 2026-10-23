# Company career boards (ATS) URL Reference

Public endpoints used by `ats-search` (verified live 2026-10-23). The CLI identifies itself honestly as `Mozilla/5.0 (compatible; ats-search-cli/1.0)`.

Boards checked are listed in `cli/companies.json` (`name`, `ats`, `slug`). Add a company by finding the board slug in its careers URL (`boards.greenhouse.io/<slug>`, `jobs.lever.co/<slug>`, `jobs.ashbyhq.com/<slug>`, `jobs.smartrecruiters.com/<slug>`), then check it with `search --company <slug>`.

## Endpoints (JSON, public)

| ATS | List | One posting |
|---|---|---|
| Greenhouse | `boards-api.greenhouse.io/v1/boards/<slug>/jobs` | `.../jobs/<id>` (`content` is HTML-escaped) |
| Lever | `api.lever.co/v0/postings/<slug>?mode=json` | `api.lever.co/v0/postings/<slug>/<id>` |
| Ashby | `api.ashbyhq.com/posting-api/job-board/<slug>` | same list, matched by `id` (`descriptionHtml`) |
| SmartRecruiters | `api.smartrecruiters.com/v1/companies/<slug>/postings?country=in&limit=100&offset=<n>` | `.../postings/<id>` (`jobAd.sections`) |

Result ids are `<ats>:<slug>:<id>`, e.g. `greenhouse:stripe:8185012`; `detail` also accepts the posting URL on any of the four hosts and company-hosted Greenhouse URLs with `gh_jid=`.
