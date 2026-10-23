import { describe, expect, test } from "bun:test"
import { experienceLevels } from "../src/helpers"
import { runCLI } from "./helpers"

describe("experienceLevels", () => {
  test("maps names to LinkedIn f_E codes, sorted and deduped", () => {
    expect(experienceLevels("entry,internship")).toBe("1,2")
    expect(experienceLevels("Entry, associate, entry")).toBe("2,3")
    expect(experienceLevels("fresher")).toBe("2")
  })
  test("rejects unknown levels instead of dropping them", () => {
    expect(experienceLevels("entry,junior")).toBeNull()
    expect(experienceLevels("")).toBeNull()
  })
  test("the CLI rejects a bad --experience-level with a JSON error", async () => {
    const r = await runCLI(["search", "-l", "India", "--experience-level", "junior"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("BAD_ARG")
  })
})
