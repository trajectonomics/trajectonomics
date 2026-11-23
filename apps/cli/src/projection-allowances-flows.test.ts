import { describe, expect, it } from "bun:test"
import type { Flow } from "@trajectonomics/core/sim"
import { targetOf } from "./projection/allowances-flow"
import { carryInFile, thRecord } from "./projection/carry-in-support"
import {
	allowances,
	allowancesHome,
	bodyOf,
	documentOf,
	RMF,
} from "./projection-allowances-support"
import { applyScenario, documentFile } from "./scenario-test-support"
import { capture } from "./test-support"

/** The year's flags with the As-of late in 2026, so the suggestions land on it. */
const LATE = ["--as-of", "2026-11-23"]

/** 720,000 of salary and nothing in RMF so far, the Carry-in a mid-year As-of needs. */
function carryIn(home: string, name: string): string {
	return carryInFile(home, [
		thRecord({
			scenario: name,
			tallies: [
				{ label: "income.section40_1", basis: "gross", amount: "720000.00" },
				{ label: RMF, basis: "funded", amount: "0.00" },
			],
		}),
	])
}

function flagsFor(home: string, name: string, extra: readonly string[]): string[] {
	return [
		"--scenario",
		name,
		...LATE,
		"--horizon",
		"2027-12-31",
		"--labels",
		RMF,
		"--step",
		"1000",
		"--carry-in",
		carryIn(home, name),
		...extra,
	]
}

/** Stores the plan `from` with the suggested Flows added as `to`, and returns the apply result. */
async function applyAs(home: string, from: string, to: string, flows: readonly unknown[]) {
	const shown = await capture(["scenario", "show", from, "--decimal", "--json"], {
		TRAJ_HOME: home,
	})
	const document = (JSON.parse(shown.out) as { scenario: { document: { flows: unknown[] } } })
		.scenario.document
	const file = documentFile({ ...document, flows: [...document.flows, ...flows] })
	return capture(["scenario", "apply", to, "--file", file, "--decimal", "--json"], {
		TRAJ_HOME: home,
	})
}

function rmfFlow(body: ReturnType<typeof bodyOf>) {
	const row = body.allowances.find((it) => it.label === RMF && it.from === "2026-01-01")
	if (row?.flow === undefined) throw new Error("no RMF suggestion")
	return row.flow
}

describe("a suggested Flow's id", () => {
	it("is free in the plan, so a second suggestion after a partial apply applies too", async () => {
		const home = await allowancesHome()
		const first = bodyOf(await allowances(home, flagsFor(home, "plan", ["--budget", "50000"])))
		expect(rmfFlow(first)).toMatchObject({ id: "rmf-fund-rmf-2026", amount: "50000.00" })
		const once = await applyAs(home, "plan", "once", [rmfFlow(first)])
		expect(once.err).toBe("")
		const second = bodyOf(await allowances(home, flagsFor(home, "once", [])))
		const flow = rmfFlow(second)
		expect(flow.id).toBe("rmf-fund-rmf-2026-2")
		expect(Number(flow.amount)).toBeGreaterThan(0)
		const twice = await applyAs(home, "once", "twice", [flow])
		expect(twice.err).toBe("")
		expect(twice.code).toBe(0)
	})

	it("takes the first free number when -2 is also used", async () => {
		const home = await allowancesHome()
		const first = bodyOf(await allowances(home, flagsFor(home, "plan", ["--budget", "50000"])))
		const flow = rmfFlow(first)
		const body = await applyAs(home, "plan", "taken", [
			flow,
			{ ...flow, id: "rmf-fund-rmf-2026-2", amount: "1000.00" },
		])
		expect(body.code).toBe(0)
		const next = bodyOf(await allowances(home, flagsFor(home, "taken", [])))
		expect(rmfFlow(next).id).toBe("rmf-fund-rmf-2026-3")
	})
})

describe("a suggestion into an Account the plan draws from", () => {
	it("has no target and says what to change", async () => {
		const home = await allowancesHome()
		const document = await documentOf(home, "plan")
		const cashflow = document["cashflow"] as { withdraw: string[] }
		const drawn = {
			...document,
			cashflow: { ...cashflow, withdraw: [...cashflow.withdraw, "rmf-fund"] },
		}
		const applied = await applyScenario(home, "drawn", drawn)
		expect(applied.code).toBe(0)
		const body = bodyOf(await allowances(home, flagsFor(home, "drawn", ["--budget", "50000"])))
		const row = body.allowances.find((it) => it.label === RMF && it.from === "2026-01-01")
		expect(row?.flow?.target).toBeUndefined()
		expect(row?.flow?.id).toBe("rmf-2026")
		expect(row?.hint).toContain("rmf-fund")
		expect(row?.hint).toContain("cashflow.withdraw")
		expect(row?.hint).toContain("add another asset Account")
	})
})

describe("targetOf", () => {
	const into = (id: string, target: string): Flow =>
		({ id, kind: "contribution", target, label: RMF }) as unknown as Flow

	it("skips an Account in cashflow.withdraw and takes the next contribution", () => {
		const flows = [into("a", "drawn"), into("b", "kept")]
		expect(targetOf(flows, RMF, ["drawn"])).toEqual({ target: "kept" })
	})

	it("names the Accounts it skipped when none is left", () => {
		expect(targetOf([into("a", "drawn")], RMF, ["drawn"])).toEqual({ withdrawn: ["drawn"] })
		expect(targetOf([], RMF, ["drawn"])).toEqual({ withdrawn: [] })
	})
})
