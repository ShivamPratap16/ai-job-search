import { expect, test } from "bun:test"
import { PORTAL, parseCards } from "../src/portal"

export const LIVE_QUERY = ["-q", "backend development", "-e", "0"]

const CARD = `<div class="container-fluid individual_internship visibilityTrackerItem " id="individual_internship_3308777" internshipId="3308777" employment_type="job" data-href='/job/detail/fresher-full-stack-developer-job-at-acme1790926300'>
  <a class="job-title-href" id="job_title" href="/job/detail/fresher-full-stack-developer-job-at-acme1790926300">Full Stack Developer</a>
  <p class="company-name"> Acme Labs </p>
  <p class="row-1-item  locations"><i class="ic-16-map-pin"></i><span><a>Chennai</a>, <a>Pune</a></span></p>
  <div class="row-1-item"><i class="ic-16-money"></i><span class="desktop"> ₹ 3,50,000 - 5,00,000 </span></div>
  <div class="row-1-item"><i class="ic-16-briefcase"></i><span>No experience required</span></div>
  <div class='job_skill'>Java</div><div class='job_skill'>Spring Boot</div>
  <div class="status-success"><i class="ic-16-reschedule"></i><span>Today</span></div>
</div>
<div class="container-fluid individual_internship" internshipId="99" employment_type="internship" data-href='/internship/detail/x99'>
  <a class="job-title-href" href="/internship/detail/x99">Intern</a>
</div>`

test("parseCards reads a job card and skips internships", () => {
  const jobs = parseCards(CARD)
  expect(jobs).toHaveLength(1)
  expect(jobs[0]).toMatchObject({
    id: "3308777", title: "Full Stack Developer", company: "Acme Labs", location: "Chennai, Pune",
    salary: "₹3.5-5 LPA", experience: "Fresher (0 yrs)", minExperience: 0, skills: ["Java", "Spring Boot"],
    url: "https://internshala.com/job/detail/fresher-full-stack-developer-job-at-acme1790926300",
  })
  expect(jobs[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

test("parseCards reads year(s) experience", () => {
  const jobs = parseCards(CARD.replace("No experience required", "2 year(s)"))
  expect(jobs[0]).toMatchObject({ experience: "2+ yrs", minExperience: 2 })
})

test("parseRef accepts detail slugs and internshala URLs only", () => {
  expect(PORTAL.parseRef("https://internshala.com/job/detail/fresher-x-job-at-acme1790926300")).toBe("/job/detail/fresher-x-job-at-acme1790926300")
  expect(PORTAL.parseRef("fresher-x-job-at-acme1790926300")).toBe("/job/detail/fresher-x-job-at-acme1790926300")
  expect(PORTAL.parseRef("https://internshala.com.evil.io/job/detail/x1790926300")).toBeNull()
})
