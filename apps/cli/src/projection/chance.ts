import { type ChanceOfSuccess, chanceOfSuccess, type ReturnModel } from "@trajectonomics/core/sim"
import type { AppError } from "../errors"
import type { Placed } from "./carryin-apply"
import { chanceRefusal } from "./chance-refusal"
import type { ChanceBandView, ChanceTableRow, ChanceView } from "./chance-view"
import { echoOf } from "./echo"
import { moneyOf } from "./money"

/** The two numbers the caller states beside the Return model: the path count and the seed. */
export type ChanceOptions = { seed: string; paths: number }

/** Every fifth annual roll-up is a row of the human table, with the first and the last. */
const SHOWN_EVERY = 5

/**
 * `traj projection chance`: the engine's chance of success in the CLI's money. The engine reports
 * it as data, so a refused input is an envelope, never a throw (ADR-0013, ADR-0030).
 */
export function chanceOf(
	placed: Placed,
	model: ReturnModel,
	options: ChanceOptions,
): ChanceView | AppError {
	const result = chanceOfSuccess(placed.baseline, placed.document, placed.timeline, {
		model,
		seed: options.seed,
		paths: options.paths,
	})
	if (!result.ok) return chanceRefusal(result.problems)
	return viewOf(placed, result.chance)
}

/** The Bands at a few roll-ups: the first, every fifth, and the last, for the human table. */
function shownRows(bands: readonly ChanceBandView[]): ChanceTableRow[] {
	return bands
		.filter(
			(_band, position) =>
				position === 0 || (position + 1) % SHOWN_EVERY === 0 || position === bands.length - 1,
		)
		.map((band) => ({
			index: band.index,
			to: band.to,
			p10: valueAt(band, 10),
			p50: valueAt(band, 50),
			p90: valueAt(band, 90),
		}))
}

function valueAt(band: ChanceBandView, level: number): string {
	return band.netWorth.find((percentile) => percentile.level === level)?.value ?? ""
}

/** The success share as a decimal percentage, from the floored basis points with no float. */
function shareOf(bps: number): string {
	return `${Math.floor(bps / 100)}.${String(bps % 100).padStart(2, "0")}%`
}

function viewOf(placed: Placed, chance: ChanceOfSuccess): ChanceView {
	const money = moneyOf(placed.currency)
	const bands: ChanceBandView[] = chance.bands.map((band) => ({
		index: band.index,
		to: band.to,
		netWorth: band.netWorth.map((percentile) => ({
			level: percentile.level,
			value: money(percentile.value),
		})),
	}))
	const rows = shownRows(bands)
	const echo = echoOf(placed)
	return {
		...echo,
		notes: [
			...echo.notes,
			`The plan holds to ${placed.timeline.horizon} on ${chance.succeeded} of ${chance.paths} seeded Market paths: a success share of ${shareOf(chance.successBps)}.`,
			`The chance is over the return model "${chance.definition.modelId}" with seed ${chance.definition.seed}, and every figure is nominal.`,
		],
		horizon: placed.timeline.horizon,
		currency: placed.currency,
		definition: chance.definition,
		paths: chance.paths,
		succeeded: chance.succeeded,
		successBps: chance.successBps,
		bands,
		runsOut: chance.runsOut.map((row) => ({ index: row.index, to: row.to, paths: row.paths })),
		tables: [{ name: "bands", count: rows.length, rows }],
	}
}
