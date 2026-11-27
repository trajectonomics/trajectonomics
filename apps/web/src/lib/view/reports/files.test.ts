import { describe, expect, test } from "bun:test"
import type { ProjectionRun, Read } from "../../contract"
import { failedRead } from "../../snapshot/fixtures.test-support"
import { projectionRunFixture } from "../projection/fixtures.test-support"
import { parseCsv } from "./csv-parse.test-support"
import {
	CSV_TYPE,
	everythingFile,
	JSON_TYPE,
	jsonText,
	reportFileName,
	runFile,
	safeName,
	tableFile,
} from "./files"
import { noProjectionReason, type ReportSource, reportSource } from "./source"
import { reportTables } from "./tables"

const ARGV = ["projection", "run", "--scenario", "base", "--as-of", "2026-10-31", "--json"]

function source(whatIf: boolean, plan = "base"): ReportSource {
	return { plan, asOf: "2026-10-31", whatIf, run: projectionRunFixture() }
}

function readOf(run: ProjectionRun): Read<ProjectionRun> {
	return { argv: ARGV, ok: true, data: run }
}

describe("report file names", () => {
	test("a file is named <plan>-<table>-<as-of> with its extension", () => {
		expect(reportFileName(source(false), "annual", "csv")).toBe("base-annual-2026-10-31.csv")
		expect(reportFileName(source(false), "projection", "json")).toBe(
			"base-projection-2026-10-31.json",
		)
	})

	test("a What-if session's file name ends in -what-if before its extension", () => {
		expect(reportFileName(source(true), "annual", "csv")).toBe("base-annual-2026-10-31-what-if.csv")
	})

	test("a plan name with a path separator or a control character is made safe for a file name", () => {
		expect(safeName("Retire/early: plan?")).toBe("Retire-early- plan-")
		expect(safeName("tab\there")).toBe("tab-here")
		expect(safeName("   ")).toBe("plan")
	})

	test("a Thai plan name is kept as it is", () => {
		expect(reportFileName(source(false, "แผนเกษียณ"), "annual", "csv")).toBe(
			"แผนเกษียณ-annual-2026-10-31.csv",
		)
	})
})

describe("report files", () => {
	test("a table's CSV is named for the table and carries the CSV media type", () => {
		const [annual] = reportTables(projectionRunFixture())
		if (annual === undefined) throw new Error("the fixture has an annual table")
		const file = tableFile(source(false), annual, ["index"])
		expect(file.name).toBe("base-annual-2026-10-31.csv")
		expect(file.type).toBe(CSV_TYPE)
		expect(parseCsv(file.text)[0]).not.toContain("index")
	})

	test("the JSON of a table is the whole run the table came from, byte for byte as the Snapshot holds it", () => {
		const run = projectionRunFixture()
		const file = runFile({ plan: "base", asOf: "2026-10-31", whatIf: false, run })
		expect(file.type).toBe(JSON_TYPE)
		expect(file.name).toBe("base-projection-2026-10-31.json")
		expect(JSON.parse(file.text)).toEqual(run)
		expect(file.text).toBe(jsonText(run))
		expect(file.text.endsWith("\n")).toBe(true)
	})

	test("everything holds only the plan's entries, unchanged, and no what-if block without a session", () => {
		const run = projectionRunFixture()
		const file = everythingFile(
			{
				projections: { base: readOf(run), other: readOf(run) },
				fi: {},
				documents: {},
				chance: {},
			},
			source(false),
			null,
		)
		expect(file.name).toBe("base-all-2026-10-31.json")
		expect(JSON.parse(file.text)).toEqual({ projections: { base: readOf(run) } })
	})

	test("in a What-if session the everything file names the changes that produced the session's run", () => {
		const run = projectionRunFixture()
		const file = everythingFile(
			{ projections: { base: readOf(run) }, fi: {}, documents: {}, chance: {} },
			source(true),
			{
				sets: [{ path: "income.salary", value: "1000" }],
				removals: ["expense.rent"],
				additions: [],
			},
		)
		expect(file.name).toBe("base-all-2026-10-31-what-if.json")
		expect(JSON.parse(file.text).whatIf).toEqual({
			plan: "base",
			sets: [{ path: "income.salary", value: "1000" }],
			removals: ["expense.rent"],
			additions: [],
			projection: run,
		})
	})
})

describe("a plan whose projection read failed", () => {
	const reads = { projections: { base: failedRead<ProjectionRun>(ARGV, "no_ledger") } }

	test("has no source, and the reason is the CLI's own message", () => {
		expect(reportSource(reads, "base", null)).toBeNull()
		expect(noProjectionReason(reads, "base")).toEqual({
			text: "no_ledger message",
			fromCli: true,
		})
		expect(noProjectionReason(reads, "missing")).toEqual({
			text: "These figures hold no projection for this plan.",
			fromCli: false,
		})
	})

	test("does not call the Dashboard's own Read errors the CLI's", () => {
		for (const code of ["traj_unavailable", "contract_mismatch"]) {
			const failed = { projections: { base: failedRead<ProjectionRun>(ARGV, code) } }
			expect(noProjectionReason(failed, "base")).toEqual({
				text: `${code} message`,
				fromCli: false,
			})
		}
	})

	test("still has an everything file, with the other reads and the failed one as the Snapshot holds them", () => {
		const file = everythingFile(
			{
				projections: reads.projections,
				fi: { base: failedRead(["fi"]) },
				documents: {},
				chance: {},
			},
			{ plan: "base", asOf: "2026-10-31", whatIf: false },
			null,
		)
		expect(file.name).toBe("base-all-2026-10-31.json")
		expect(JSON.parse(file.text).projections).toEqual({ base: reads.projections.base })
		expect(JSON.parse(file.text).fi.base.ok).toBe(false)
	})
})

describe("reportSource", () => {
	test("the What-if session's run replaces the plan's own run, and a plan with no run gives none", () => {
		const baseline = projectionRunFixture()
		const session = projectionRunFixture({
			asOf: "2026-10-31",
			runsOut: { date: "2030-01-01", unmet: "1.00" },
		})
		const reads = { projections: { base: readOf(baseline) } }
		const lens = { plan: "base", run: session, fi: null, compare: null, chance: null }
		const picked = reportSource(reads, "base", lens)
		expect(picked?.whatIf).toBe(true)
		expect(picked?.run).toBe(session)
		expect(reportSource(reads, "missing", null)).toBeNull()
		expect(reportSource(reads, "base", null)?.whatIf).toBe(false)
	})
})
