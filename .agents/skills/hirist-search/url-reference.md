# Hirist URL Reference

Public endpoints used by `hirist-search` (verified live 2026-10-23). The CLI identifies itself honestly as `Mozilla/5.0 (compatible; hirist-search-cli/1.0)`.

## Search (JSON)

```
GET https://gladiator.hirist.tech/job/search?query=<q>&minexp=0&maxexp=<years>&pageNo=<0-based>&size=30
```

Response: `{ data: [...], totalJobs, hasMore }`. Each job: `id`, `title` ("Company - Role"), `min`/`max` (years), `jobDetailUrl`, `createdTimeMs`, `locations[].name`, `companyData.companyName`, `tags[].name` (skills), `minSal`/`maxSal` (lakhs) with `hideSal`.

## Detail (JSON)

```
GET https://gladiator.hirist.tech/job/detail?jobcode=<id>
```

`data`: the search fields plus `introText` and `description` (HTML).
