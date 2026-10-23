# Internshala URL Reference

Public endpoints used by `internshala-search` (verified live 2026-10-23). The CLI identifies itself honestly as `Mozilla/5.0 (compatible; internshala-search-cli/1.0)`.

## Search (server-rendered HTML)

```
GET https://internshala.com/jobs/<query-slug>-jobs[-in-<city>]/[page-<n>/]
GET https://internshala.com/fresher-jobs/<query-slug>-jobs[-in-<city>]/      (no-experience roles only)
GET https://internshala.com/jobs/keywords-<free text>[/in-<city>]/           (fallback when the slug is not a category)
```

Cities use Internshala's slugs (`bangalore`, `gurgaon`, `work-from-home`). Each result is a `<div class="container-fluid individual_internship ..." internshipId="<id>" employment_type="job" data-href='/job/detail/<slug>'>` card:

| Field | Anchor |
|---|---|
| title | `a.job-title-href` |
| company | `p.company-name` |
| locations | `p.row-1-item.locations` |
| salary | `.ic-16-money` + `span.desktop` ("₹ 3,50,000 - 5,00,000") |
| experience | `.ic-16-briefcase` + `span` ("No experience required", "1 year(s)") |
| posted | `.status-success` / `.status-inactive` span ("Today", "2 weeks ago") |
| skills | `div.job_skill` |

## Detail

```
GET https://internshala.com/job/detail/<slug>
```

Sections are `h2/h3.section_heading` blocks: "About the job", "Skill(s) required", "Salary" (probation duration and pay, then annual CTC), "Number of openings", "About <company>". The "Apply By" date sits in an `item_body` after the `Apply By` label.
