import type { Account, Baseline, Flow, Scenario, Timeline } from "@trajectonomics/core/sim"
import { emitThLevy } from "@trajectonomics/core/tax/th"
import type { Persona, PersonaFlow } from "./persona"
import { profileOf } from "./tax-input"

/** The Levy's id in the oracle's Scenario; the tax core's own default name. */
const LEVY_ID = "th-2026-pit"
/** Satang per baht: the sim engine's money unit is the minor unit. */
const MINOR_PER_BAHT = 100

/** Money in the sim engine's minor units. */
export function minor(baht: number): number {
	return Math.round(baht * MINOR_PER_BAHT)
}

function accountOf(account: Persona["accounts"][number]): Account {
	return { id: account.id, kind: account.kind, rate: account.rateBps } as Account
}

function flowOf(flow: PersonaFlow, monthlyBaht: number, asOf: string): Flow {
	const amount = minor(monthlyBaht)
	const common = { id: flow.id, frequency: "monthly" as const, start: asOf }
	const growth = flow.growth === "inflation" ? ("inflation" as const) : { bps: 0 }
	if (flow.kind === "income") {
		const base = {
			...common,
			kind: "income" as const,
			earned: flow.earned === true,
			amount,
			growth,
		}
		return flow.label === undefined ? base : { ...base, label: flow.label }
	}
	if (flow.kind === "expense") return { ...common, kind: "expense", amount, growth }
	return { ...common, kind: "contribution", target: flow.target ?? "", amount, growth }
}

/** Asset accounts a contribution Flow pays into; the engine needs them routed in `cashflow.contribute`. */
function assetContributionTargets(persona: Persona): string[] {
	const assets = new Set(persona.accounts.filter((a) => a.kind === "asset").map((a) => a.id))
	return persona.flows.flatMap((flow) =>
		flow.kind === "contribution" && flow.target !== undefined && assets.has(flow.target)
			? [flow.target]
			: [],
	)
}

/**
 * The Thai Levy the Scenario charges. The 2025 period settles on 31 March 2026, after the As-of,
 * so the engine needs its carry-in. Nothing was tallied before the plan starts, so the record is
 * the empty scope record the CLI writes for this build's Levy (ADR-0032).
 */
function levyOf(persona: Persona) {
	const levy = emitThLevy({ ...profileOf(persona), levy: { id: LEVY_ID } })
	const year = Number(persona.asOf.slice(0, 4)) - 1
	return { ...levy, carryIn: [{ periodStart: `${year}-01-01`, tallies: [], prepaid: 0 }] }
}

/** The Scenario the engine charges, with an optional one-Flow what-if applied. */
export function scenarioOf(
	persona: Persona,
	override?: { id: string; monthlyBaht: number },
): Scenario {
	const flows = persona.flows.map((flow) =>
		flowOf(
			flow,
			override !== undefined && override.id === flow.id ? override.monthlyBaht : flow.monthlyBaht,
			persona.asOf,
		),
	)
	return {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: persona.inflationBps },
		accounts: persona.accounts.map(accountOf),
		flows,
		cashflow: {
			surplus: [{ account: persona.cashflow.surplusTo }],
			contribute: assetContributionTargets(persona),
			withdraw: persona.cashflow.withdrawFrom,
		},
		levies: [levyOf(persona)],
	}
}

/** The opening balances at the As-of, in the engine's minor units. */
export function baselineOf(persona: Persona): Baseline {
	return {
		schemaVersion: 1,
		balances: persona.accounts.map((account) => ({
			account: account.id,
			amount: minor(account.openingBaht),
		})),
	}
}

/** The Projection's window: from the As-of to the horizon, by month. */
export function timelineOf(persona: Persona): Timeline {
	return { start: persona.asOf, horizon: persona.horizon, resolution: "month" }
}
