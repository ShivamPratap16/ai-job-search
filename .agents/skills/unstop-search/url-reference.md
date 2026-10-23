# Unstop URL Reference

Public endpoints used by `unstop-search` (verified live 2026-10-23). The CLI identifies itself honestly as `Mozilla/5.0 (compatible; unstop-search-cli/1.0)`.

## Search (JSON)

```
GET https://unstop.com/api/public/opportunity/search-result?opportunity=jobs&oppstatus=open&searchTerm=<q>&per_page=30&page=<n>
```

Response: `data.data[]` with `id`, `title`, `seo_url`, `organisation.name`, `locations[].city`, `approved_date`, `end_date`, `filters[]` (type `eligible`: "Fresher", "Experienced Professionals", "Engineering Students"), `required_skills[]`, and `jobDetail` (`min_salary`, `max_salary`, `pay_in`, `show_salary`, `min_experience`, `max_experience`, `type`).

## Detail (JSON)

```
GET https://unstop.com/api/public/competition/<id>
```

`data.competition`: `title`, `details` (HTML description), `start_date`, `end_date`, `regn_open`, `organisation`, `locations`, `filters`, `job_detail`.
