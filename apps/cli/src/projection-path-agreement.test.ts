import { describe, expect, it } from "bun:test"
import type { Scenario } from "@trajectonomics/core/sim"
import type { ChanceOutcomeView } from "./projection/chance-outcomes-view"
import { ILLUSTRATIVE_SEED } from "./projection/chance-testing"
import { VOLATILE_PLAN } from "./projection/plan-model-testing"
import type { AnnualRow } from "./projection/run-view"
import { baseFlags, projectionHome } from "./projection/testing"
import {
	chanceWithOutcomes,
	outcomesRun,
	pathAt,
	pathBody,
} from "./projection-chance-outcomes-support"
import { applyScenario } from "./scenario-test-support"

/*
 * `projection path --index i` against `projection chance --outcomes` (cli ADR-0069): the result the
 * chance lists for a path is the one the replay of that path reaches, for every path of a run.
 */

/** Each test replays all 200 paths: about 3 s alone, so under CI load it needs more than Bun's 5 s default. */
const ALL_PATHS_MS = 20_000

/** A decimal money string as satang, to order and compare figures without a float. */
const satang = (money: string): bigint => BigInt(money.replace(".", ""))

/** What the replay of path `index` reads as the outcome the chance lists. */
async function replayed(
	home: string,
	flags: string[],
	index: number,
): Promise<Omit<ChanceOutcomeView, "index">> {
	const path = pathBody(await pathAt(home, flags, index))
	const annual = path.tables.find((table) => table.name === "annual")
	const rows = (annual?.rows ?? []) as AnnualRow[]
	const lowest = rows.reduce((least, row) =>
		satang(row.closingNetWorth) < satang(least.closingNetWorth) ? row : least,
	)
	return {
		closingNetWorth: rows.at(-1)?.closingNetWorth ?? "",
		lowestNetWorth: lowest.closingNetWorth,
		lowestYear: lowest.from,
		runsOut: path.runsOut,
	}
}

/** Every path of the run, replayed, against the outcome the chance lists at the same index. */
async function expectEveryPathAgrees(home: string, flags: string[], paths: number) {
	const chance = await chanceWithOutcomes(home, flags)
	expect(chance.outcomes).toHaveLength(paths)
	for (let index = 0; index < paths; index += 1) {
		expect({ index, ...(await replayed(home, flags, index)) }).toEqual(
			chance.outcomes?.[index] as ChanceOutcomeView,
		)
	}
	return chance
}

describe("projection path agrees with projection chance --outcomes", () => {
	it(
		"on all 200 paths of a run whose paths never run out: closing, lowest, the year it was lowest in",
		async () => {
			const { home, flags } = await outcomesRun(200)
			await expectEveryPathAgrees(home, flags, 200)
		},
		ALL_PATHS_MS,
	)

	it(
		"on all 200 paths of a plan whose paths run out at different dates, and names the earliest and the lowest",
		async () => {
			const home = await projectionHome()
			const assetsSwing = (account: Scenario["accounts"][number]) =>
				account.kind === "asset" ? { ...account, volatility: 9000 } : account
			const plan: Scenario = {
				...VOLATILE_PLAN,
				accounts: VOLATILE_PLAN.accounts.map(assetsSwing),
				flows: [
					...VOLATILE_PLAN.flows,
					{
						id: "buy",
						kind: "expense",
						amount: 20_000_000,
						frequency: "once",
						start: "2029-01-31",
						growth: { bps: 0 },
					},
				],
			}
			expect((await applyScenario(home, "mixed", plan)).code).toBe(0)
			const flags = [
				...baseFlags("mixed"),
				"--horizon",
				"2031-03-30",
				"--return-model",
				"plan",
				"--paths",
				"200",
				"--seed",
				ILLUSTRATIVE_SEED,
			]
			const chance = await expectEveryPathAgrees(home, flags, 200)
			const ranOut = (chance.outcomes ?? []).filter((outcome) => outcome.runsOut !== null)
			expect(ranOut).toHaveLength(4)
			// Four paths run out on the same date, so the earliest is the first of them by index.
			expect(chance.representative?.earliestRunsOut).toBe(24)
			expect(chance.representative?.lowest).toBe(115)
			expect(new Set(ranOut.map((outcome) => outcome.runsOut?.date)).size).toBe(1)
			expect(ranOut[0]?.index).toBe(24)
		},
		ALL_PATHS_MS,
	)
})
