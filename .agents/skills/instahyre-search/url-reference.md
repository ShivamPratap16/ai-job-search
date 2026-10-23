# Instahyre URL Reference

Public endpoints used by `instahyre-search` (verified live 2026-10-23). The CLI identifies itself honestly as `Mozilla/5.0 (compatible; instahyre-search-cli/1.0)`.

## Search

```
GET https://www.instahyre.com/api/v1/job_search?skills=<skill or job function>&years=<candidate years>&limit=35&offset=<n>
```

| Param | Meaning |
|---|---|
| `skills` | A skill ("Java", "Spring Boot") or a job function ("Backend Development") |
| `years` | The candidate's years of experience; the API returns roles open at that level |
| `limit` / `offset` | Page size is fixed server-side at 35 |

Response: `{ meta: { total_count, top_locations_count, ... }, objects: [...] }`. Each object: `id`, `title`, `locations` (comma string), `public_url`, `employer.company_name`, `keywords` (skills). No posting date, salary or experience range.

## Detail

```
GET https://www.instahyre.com/job-<id>/          (redirects to the slugged URL)
```

The page carries a schema.org `JobPosting` JSON-LD block: `title`, `description` (HTML), `datePosted`, `employmentType`, `hiringOrganization.name`, `jobLocation[].address.addressLocality`.
