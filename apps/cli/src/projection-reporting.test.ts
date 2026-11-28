import { describe, expect, it } from "bun:test"
import { goldenTextIn, recordGoldenTextIn } from "./golden-test-support"
import { projection } from "./projection/testing"
import { REPORTING_AS_OF, REPORTING_HORIZON } from "./projection-reporting-plan"
import { reportingHome } from "./projection-reporting-support"
import { runBody, tableOf } from "./projection-run-support"
import { capture } from "./test-support"

/*
 * `projection run` and `projection path` report the cash flow per Reporting year and month (cli
 * ADR-0086). The goldens pin the bytes, and the path's months are the run's on the same plan.
 */

const GOLDENS = new URL("./projection/fixtures/", import.meta.url)

const FLAGS = [
	"--scenario",
	"reporting",
	"--as-of",
	REPORTING_AS_OF,
	"--horizon",
	REPORTING_HORIZON,
]

const REPORTING_FLAGS = ["--breakdown-years", "--breakdown-months", "first"]

function goldenId(out: string, id: string): string {
	return out.replace(`"${id}"`, '"the-scenario-id"')
}

describe("projection run --breakdown-years and --breakdown-months: the bytes are pinned", () => {
	it("pins the JSON, byte for byte", async () => {
		const home = await reportingHome()
		const res = await projection(home, ["run", ...FLAGS, ...REPORTING_FLAGS])
		expect(res.code).toBe(0)
		expect(res.err).toBe("")
		const text = `${goldenId(res.out, runBody(res).scenario.id)}\n`
		await recordGoldenTextIn(GOLDENS, "run-reporting.output", text)
		expect(await goldenTextIn(GOLDENS, "run-reporting.output")).toBe(text)
	})

	it("pins the human form, byte for byte", async () => {
		const home = await reportingHome()
		const res = await capture(["projection", "run", ...FLAGS, ...REPORTING_FLAGS], {
			TRAJ_HOME: home,
		})
		expect(res.code).toBe(0)
		expect(res.err).toBe("")
		await recordGoldenTextIn(GOLDENS, "run-reporting-human.output", res.out)
		expect(await goldenTextIn(GOLDENS, "run-reporting-human.output")).toBe(res.out)
	})

	it("pins a path's JSON and human form, byte for byte", async () => {
		const home = await reportingHome()
		const pathFlags = [
			"path",
			...FLAGS,
			"--return-model",
			`${home}/reporting-model.json`,
			"--paths",
			"4",
			"--seed",
			"0123456789abcdef",
			"--index",
			"1",
			"--breakdown-years",
			"--breakdown-months",
			"first",
		]
		const res = await projection(home, pathFlags)
		expect(res.code).toBe(0)
		const text = `${goldenId(res.out, runBody(res).scenario.id)}\n`
		await recordGoldenTextIn(GOLDENS, "path-reporting.output", text)
		expect(await goldenTextIn(GOLDENS, "path-reporting.output")).toBe(text)
		const human = await capture(["projection", ...pathFlags], { TRAJ_HOME: home })
		expect(human.code).toBe(0)
		await recordGoldenTextIn(GOLDENS, "path-reporting-human.output", human.out)
		expect(await goldenTextIn(GOLDENS, "path-reporting-human.output")).toBe(human.out)
	})
})

describe("projection path repeats a run's Reporting months", () => {
	it("states the same cashflowMonths and totals as the run, with a flat Return model", async () => {
		const home = await reportingHome()
		const run = runBody(await projection(home, ["run", ...FLAGS, "--breakdown-months", "first"]))
		const path = runBody(
			await projection(home, [
				"path",
				...FLAGS,
				"--return-model",
				`${home}/reporting-model.json`,
				"--paths",
				"4",
				"--seed",
				"0123456789abcdef",
				"--index",
				"1",
				"--breakdown-months",
				"first",
			]),
		)
		expect(tableOf(path, "cashflowMonths").rows).toEqual(tableOf(run, "cashflowMonths").rows)
		expect(tableOf(path, "cashflowMonthTotals").rows).toEqual(
			tableOf(run, "cashflowMonthTotals").rows,
		)
	})
})
