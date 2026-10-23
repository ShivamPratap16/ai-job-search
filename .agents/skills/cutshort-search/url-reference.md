# Cutshort URL Reference

Public endpoints used by `cutshort-search` (verified live 2026-10-23). The CLI identifies itself honestly as `Mozilla/5.0 (compatible; cutshort-search-cli/1.0)`.

## Search (Next.js hub pages)

```
GET https://cutshort.io/jobs/<query-slug>-jobs[-in-<city-slug> | -remote][?page=<n>]
```

City slugs: `bangalore-bengaluru`, `gurugram`, `delhi-ncr-gurgaon-and-noida`, `mumbai`, `pune`, `hyderabad`, `chennai`. The job list is in `<script id="__NEXT_DATA__">`: `props.pageProps.dehydratedState.queries[queryKey[0]="jobListData"].state.data.data.pageData.jobs[]`, 50 per page, each with `publicUrl`, `headline`, `companyDetails.name`, `locationsText`, `remoteType`, `expRange{min,max}`, `salaryRange{currency,min,max,hideSalary}`, `allSkills[]`.

## Detail

```
GET https://cutshort.io/job/<slug>
```

schema.org `JobPosting` JSON-LD: `title`, `description`, `datePosted`, `validThrough`, `employmentType`, `experienceRequirements.monthsOfExperience`, `baseSalary`, `skills`.
