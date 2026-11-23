/**
 * The four reads a what-if runs, as argv: `projection run`, `fi`, `projection compare` and, when the
 * Snapshot states a Return model, `projection chance`. Each is a read leaf (`snapshot/leaves.ts`), so a
 * what-if writes nothing: the Overrides are applied transiently, and each read takes them as `--set` and
 * `--without` tokens with `--decimal` ([cli ADR 0056](../../../../cli/docs/adr/0056-a-what-if-takes-a-list-item-out-and-reads-its-amounts-in-major-units.md)).
 * Pure: `argv.test.ts` pins each argv.
 */
import type { PlanParams } from "../snapshot/params"
import type { PlannedRead } from "../snapshot/planned"
import type { WhatIfBody } from "./overrides"

/** The four reads of one what-if. `chance` is null when the Snapshot states no Return model. */
export type WhatIfReads = {
	projection: PlannedRead
	fi: PlannedRead
	compare: PlannedRead
	chance: PlannedRead | null
}

/**
 * One `--without=<path>` per Removal, then one `--add=<list>=<json>` per Addition, then one `--set=<path>=<json>`
 * per Set: the order `traj` applies them in (cli ADR 0062), and each value is one token.
 */
export function overrideTokens(
	whatIf: Pick<WhatIfBody, "sets" | "removals"> & { additions?: WhatIfBody["additions"] },
): string[] {
	return [
		...whatIf.removals.map((path) => `--without=${path}`),
		...(whatIf.additions ?? []).map((one) => `--add=${one.list}=${JSON.stringify(one.item)}`),
		...whatIf.sets.map((set) => `--set=${set.path}=${JSON.stringify(set.value)}`),
	]
}

/** The date flags every projection-shaped read takes, and the Carry-in on standard input when one is stated. */
function projectionFlags(params: PlanParams): string[] {
	const carry = params.carryIn ? ["--carry-in", "-"] : []
	return ["--as-of", params.asOf, "--horizon", params.horizon, ...carry]
}

/** One read's standard input is the Carry-in of its plan, when the Plan states one. */
function carryFor(params: PlanParams, plan: string): string[] {
	return params.carryIn ? [plan] : []
}

/**
 * The reads of one what-if. The projection takes `--breakdown`, as every run of the Snapshot does, so the
 * Cash flow page can show the what-if's lines and section totals (cli ADR 0058, addendum), and `--spending`, so the
 * Withdrawals page can show the Rule years of a what-if (cli ADR 0063). The plan's name follows `--scenario=`, as the Snapshot's reads do, so a name
 * that starts with a dash is still one token; `projection compare` takes its name after `--`.
 */
export function whatIfReads(params: PlanParams, whatIf: WhatIfBody): WhatIfReads {
	const plan = whatIf.plan
	const overrides = [...overrideTokens(whatIf), "--decimal"]
	const monthly = params.monthly ? ["--monthly"] : []
	const scenario = `--scenario=${plan}`
	const chance = params.chance
	return {
		projection: {
			argv: [
				"projection",
				"run",
				scenario,
				...projectionFlags(params),
				...monthly,
				"--breakdown",
				"--spending",
				...overrides,
				"--json",
			],
			carryInFor: carryFor(params, plan),
		},
		fi: {
			argv: ["fi", scenario, ...projectionFlags(params), ...overrides, "--json"],
			carryInFor: carryFor(params, plan),
		},
		compare: {
			argv: [
				"projection",
				"compare",
				...projectionFlags(params),
				...overrides,
				"--json",
				"--",
				plan,
			],
			carryInFor: carryFor(params, plan),
		},
		chance:
			chance === null
				? null
				: {
						argv: [
							"projection",
							"chance",
							scenario,
							...projectionFlags(params),
							`--return-model=${chance.returnModel}`,
							`--paths=${chance.paths}`,
							`--seed=${chance.seed}`,
							...overrides,
							"--json",
						],
						carryInFor: carryFor(params, plan),
					},
	}
}
