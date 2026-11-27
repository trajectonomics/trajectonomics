import { checkPlanOptions } from "../check/plan-model"
import type {
	Account,
	AssetRule,
	MarketBucket,
	PlanReturnModelNote,
	PlanReturnModelOptions,
	PlanReturnModelResult,
	ReturnModel,
	Scenario,
} from "../types"
import { monthReturn, monthVolatility, spanNumerator } from "./month-return"
import { normalQuantiles } from "./normal-quantiles"
import { inflationFactorOf } from "./plan-inflation"
import { wholeBasisPoints } from "./whole-bps"

/** The least and greatest span return a Return model may state (`checkReturnModel`). */
const FLOOR = -9999n
const CEILING = 10_000n
const TWO_32 = 4_294_967_296

function swings(account: Account): account is AssetRule & { readonly volatility: number } {
	return account.kind === "asset" && (account.volatility ?? 0) > 0
}

interface Column {
	readonly returns: readonly number[]
	readonly clamped: number
}

/** One Account's span return in every bucket: `m + z * s`, rounded to whole basis points and clamped. */
function column(
	account: AssetRule & { readonly volatility: number },
	z: readonly number[],
): Column {
	const m = monthReturn(account.rate, account.compounding)
	const s = monthVolatility(account.volatility)
	let clamped = 0
	const returns = wholeBasisPoints(z.map((quantile) => spanNumerator(m, s, quantile))).map(
		(value) => {
			const kept = value < FLOOR ? FLOOR : value > CEILING ? CEILING : value
			if (kept !== value) clamped++
			return Number(kept)
		},
	)
	return { returns, clamped }
}

/**
 * The Return model a plan implies (ADR 0029): every Account with a `volatility` above 0 moves with one
 * shared standard normal draw per bucket; every other Account is left out of the model and keeps its
 * rate. The same Scenario and bucket count give a byte-identical model. The Scenario must pass `check()`.
 */
export function planReturnModel(
	scenario: Scenario,
	options: PlanReturnModelOptions,
): PlanReturnModelResult {
	const problems = checkPlanOptions(options)
	if (problems.length > 0) return { ok: false, problems }
	const z = normalQuantiles(options.buckets)
	const accounts = scenario.accounts.filter(swings)
	const columns = accounts.map((account) => column(account, z))
	const weight = TWO_32 / options.buckets
	const buckets: MarketBucket[] = z.map((_, index) => ({
		returnsBps: columns.map((item) => item.returns[index]!),
		weight,
	}))
	const notes: PlanReturnModelNote[] = accounts.flatMap((account, index) =>
		columns[index]!.clamped > 0 ? [{ account: account.id, clamped: columns[index]!.clamped }] : [],
	)
	const inflation = inflationFactorOf(scenario, z, weight)
	const model: ReturnModel = {
		id: `plan-${options.buckets}`,
		accounts: accounts.map((a) => a.id),
		buckets,
		...(inflation.factor === undefined ? {} : { inflation: inflation.factor }),
	}
	return {
		ok: true,
		model,
		notes,
		...(inflation.clamped > 0 ? { inflationClamped: inflation.clamped } : {}),
	}
}
