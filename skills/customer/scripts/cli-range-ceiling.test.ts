import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { cliRangeCeiling } from "./cli-range"
import { hasPassedCeiling, recheckIssues, recheckTitle } from "./cli-range-ceiling"
import { MANIFEST_PATH, type ManifestRow, parseSkillManifest } from "./skills-manifest"

const ROW: ManifestRow = { name: "traj", path: "skills/traj", cliRange: ">=0.2.0 <0.3.0" }

describe("cliRangeCeiling", () => {
	it("reads the upper bound, and whether it is inclusive", () => {
		expect(cliRangeCeiling(">=0.2.0 <0.3.0")).toEqual({ version: "0.3.0", inclusive: false })
		expect(cliRangeCeiling(">=0.2.0 <=0.4.0")).toEqual({ version: "0.4.0", inclusive: true })
	})

	it("takes the lowest of several upper bounds, the one that binds", () => {
		expect(cliRangeCeiling(">=0.2.0 <0.5.0 <0.3.0")).toEqual({ version: "0.3.0", inclusive: false })
	})

	it("states none for a range with no upper bound", () => {
		expect(cliRangeCeiling(">=0.2.0")).toBeNull()
	})

	it("refuses a range that is not a floor with a ceiling above it, as cliFloor does", () => {
		expect(() => cliRangeCeiling("<0.3.0")).toThrow()
	})
})

describe("hasPassedCeiling", () => {
	it("is not passed below the upper bound", () => {
		expect(hasPassedCeiling(ROW.cliRange, "0.2.9")).toBe(false)
	})

	it("is passed at a `<` upper bound, the version the range excludes", () => {
		expect(hasPassedCeiling(ROW.cliRange, "0.3.0")).toBe(true)
		expect(hasPassedCeiling(ROW.cliRange, "0.3.1")).toBe(true)
	})

	it("is not passed at a pre-release of the bound, which orders below its release", () => {
		expect(hasPassedCeiling(ROW.cliRange, "0.3.0-rc.1")).toBe(false)
	})

	it("is passed at a `<=` bound only once the version is past it", () => {
		expect(hasPassedCeiling(">=0.2.0 <=0.4.0", "0.4.0")).toBe(false)
		expect(hasPassedCeiling(">=0.2.0 <=0.4.0", "0.4.1")).toBe(true)
	})

	it("is never passed by a range with no upper bound", () => {
		expect(hasPassedCeiling(">=0.2.0", "9.9.9")).toBe(false)
	})
})

describe("recheckIssues", () => {
	it("opens one issue, titled as the recheck names it, for each row the latest has passed", () => {
		const issues = recheckIssues([ROW], "0.3.0", [])
		expect(issues).toHaveLength(1)
		expect(issues[0]?.title).toBe(
			"Recheck skill traj: traj 0.3.0 has passed its CLI Range >=0.2.0 <0.3.0",
		)
		expect(issues[0]?.title).toBe(recheckTitle(ROW, "0.3.0"))
		expect(issues[0]?.body).toContain("ADR 0004")
	})

	it("opens nothing while the latest is still inside every range", () => {
		expect(recheckIssues([ROW], "0.2.9", [])).toEqual([])
	})

	it("opens nothing for a title an open issue already carries", () => {
		const open = [recheckTitle(ROW, "0.3.0")]
		expect(recheckIssues([ROW], "0.3.0", open)).toEqual([])
	})

	it("still opens for a row whose title no open issue carries, even beside a duplicate", () => {
		const other: ManifestRow = { ...ROW, name: "traj-plan" }
		const open = [recheckTitle(ROW, "0.3.0")]
		const issues = recheckIssues([ROW, other], "0.3.0", open)
		expect(issues.map((issue) => issue.title)).toEqual([recheckTitle(other, "0.3.0")])
	})

	it("refuses a latest that is not a stable X.Y.Z version", () => {
		expect(() => recheckIssues([ROW], "0.3.0-rc.1", [])).toThrow("stable X.Y.Z")
		expect(() => recheckIssues([ROW], "", [])).toThrow("stable X.Y.Z")
	})

	it("checks the published manifest, which passes no ceiling at the release it ships with", () => {
		const manifest = parseSkillManifest(
			readFileSync(new URL(`../${MANIFEST_PATH}`, import.meta.url), "utf8"),
		)
		expect(recheckIssues(manifest.skills, "0.2.9", [])).toEqual([])
		expect(recheckIssues(manifest.skills, "0.3.0", [])).toHaveLength(manifest.skills.length)
	})
})
