import { type ChanceOfSuccess, chanceOfSuccess } from "@trajectonomics/core/sim"
import { type AppError, fail, isAppError } from "../errors"
import type { Placed } from "./carryin-apply"
import { type ModelSource, type PlanModel, planModelOf } from "./chance-plan"
import { chanceRefusal } from "./chance-refusal"
import { percentilesOf, shownRows, spendingOf } from "./chance-spending"
import type { ChanceBandView, ChanceView } from "./chance-view"
import { echoOf } from "./echo"
import { moneyOf } from "./money"

/** The two numbers the caller states beside the Return model: the path count and the seed. */
export type ChanceOptions = { seed: string; paths: number }

/**
 * `traj projection chance`: the engine's chance of success in the CLI's money. The engine reports
 * it as data, so a refused input is an envelope, never a throw (ADR-0013, ADR-0030).
 */
export function chanceOf(
	placed: Placed,
	source: ModelSource,
	options: ChanceOptions,
): ChanceView | AppError {
	// The plan after the what-ifs: a `--set` on a volatility changes the model it builds.
	const built = source.kind === "plan" ? planModelOf(placed.document, source.buckets) : undefined
	if (isAppError(built)) return built
	const model = built === undefined && source.kind === "file" ? source.model : built?.model
	if (model === undefined) return fail("internal", { message: "The chance has no Return model." })
	const result = chanceOfSuccess(placed.baseline, placed.document, placed.timeline, {
		model,
		seed: options.seed,
		paths: options.paths,
	})
	if (!result.ok) return chanceRefusal(result.problems)
	return viewOf(placed, result.chance, built)
}

/** The success share as a decimal percentage, from the floored basis points with no float. */
function shareOf(bps: number): string {
	return `${Math.floor(bps / 100)}.${String(bps % 100).padStart(2, "0")}%`
}

function viewOf(placed: Placed, chance: ChanceOfSuccess, plan?: PlanModel): ChanceView {
	const money = moneyOf(placed.currency)
	const bands: ChanceBandView[] = chance.bands.map((band) => ({
		index: band.index,
		to: band.to,
		netWorth: percentilesOf(band.netWorth, money),
	}))
	const rows = shownRows(bands, (band) => band.netWorth)
	// A plan with a spending rule adds its Bands, its lowest year and what they count (cli ADR-0063).
	const spending = spendingOf(chance, money)
	const echo = echoOf(placed)
	return {
		...echo,
		notes: [
			...echo.notes,
			`The plan holds to ${placed.timeline.horizon} on ${chance.succeeded} of ${chance.paths} seeded Market paths: a success share of ${shareOf(chance.successBps)}.`,
			`The chance is over the return model "${chance.definition.modelId}" with seed ${chance.definition.seed}, and every figure is nominal.`,
			...(plan === undefined ? [] : planNotes(plan)),
			...spending.notes,
		],
		horizon: placed.timeline.horizon,
		currency: placed.currency,
		definition: chance.definition,
		...(plan === undefined ? {} : { returnModel: plan.view }),
		paths: chance.paths,
		succeeded: chance.succeeded,
		successBps: chance.successBps,
		bands,
		runsOut: chance.runsOut.map((row) => ({ index: row.index, to: row.to, paths: row.paths })),
		...spending.fields,
		tables: [{ name: "bands", count: rows.length, rows }, ...spending.tables],
	}
}

/** What a plan-built model says beside the chance: where it came from, and what the engine clamped. */
function planNotes(plan: PlanModel): string[] {
	const accounts = plan.view.accounts
		.map((a) => `${a.id} (rate ${a.rate} bps, volatility ${a.volatility} bps)`)
		.join(", ")
	return [
		`The return model is the plan's own, built in ${plan.view.buckets} buckets from the Accounts that swing: ${accounts}. Every Account without a volatility keeps its rate.`,
		...plan.notes,
	]
}
