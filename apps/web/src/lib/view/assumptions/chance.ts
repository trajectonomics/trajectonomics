import type { ProjectionChance, Snapshot } from "../../contract"
import { formatBps } from "../../format/bps"

/** The text of the two chance inputs. Nothing is made up: with no chance read, both are empty. */
export interface ChanceText {
	paths: string
	seed: string
}

/** The inputs the Snapshot states, as text; both empty when it states none. */
export function chanceTextOf(params: Snapshot["params"]): ChanceText {
	return params.chance === null
		? { paths: "", seed: "" }
		: { paths: String(params.chance.paths), seed: params.chance.seed }
}

const SEED = /^[0-9a-f]{16}$/

/** The inputs a reread sends, or the problem at each field. The CLI's own limits: 1 to 10,000 paths, sixteen lower-case hex digits. */
export function chanceInputsOf(
	text: ChanceText,
): { ok: true; paths: number; seed: string } | { ok: false; problems: Record<string, string> } {
	const problems: Record<string, string> = {}
	const paths = /^\d{1,5}$/.test(text.paths.trim()) ? Number(text.paths.trim()) : 0
	if (paths < 1 || paths > 10000) problems["paths"] = "Enter a whole number from 1 to 10,000."
	const seed = text.seed.trim()
	if (!SEED.test(seed))
		problems["seed"] = "Enter sixteen lower-case hex digits, such as 0123456789abcdef."
	return Object.keys(problems).length > 0 ? { ok: false, problems } : { ok: true, paths, seed }
}

/** Where a chance read's model came from, in words, and what it was built from. */
export interface ChanceSource {
	readonly kind: "plan" | "file"
	/** "Built from your plan" or "Read from a Return model file". */
	readonly heading: string
	readonly detail: string
	/** The Accounts the plan's model was built from, with the CLI's `rate` and `volatility` as percents; empty for a file. */
	readonly accounts: readonly { id: string; rate: string; volatility: string }[]
}

/** The source of one chance read: the CLI's `returnModel` echo says the plan built it; without one, a file did. */
export function chanceSourceWords(read: ProjectionChance): ChanceSource {
	const built = read.returnModel
	if (built === undefined) {
		return {
			kind: "file",
			heading: "Read from a Return model file",
			detail: `The model is ${read.definition.modelId}, from the file this Dashboard was started with.`,
			accounts: [],
		}
	}
	const count = built.accounts.length
	return {
		kind: "plan",
		heading: "Built from your plan",
		detail: `${count} ${count === 1 ? "account swings" : "accounts swing"}, drawn in ${built.buckets} steps; every other account keeps its return.`,
		accounts: built.accounts.map((account) => ({
			id: account.id,
			rate: `${formatBps(account.rate)}%`,
			volatility: `${formatBps(account.volatility)}%`,
		})),
	}
}
