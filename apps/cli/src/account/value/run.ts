import type { Context, Result } from "../../command"
import { ok } from "../../command"
import { checkedDate } from "../../date"
import { type AppError, fail, isAppError } from "../../errors"
import { withStore } from "../../with-store"
import type { ValueDocument } from "./document"
import { planValues, type ValueRequest } from "./plan"
import type { ValueResult, ValuesResult } from "./schema"
import { viewValue, viewValues } from "./view"

/** The flag form's input: every field optional, because `--file` and `--template` take none of them. */
export type ValueFlags = {
	account?: string | undefined
	value?: string | undefined
	date?: string | undefined
	against?: string | undefined
	file?: string | undefined
	template?: boolean | undefined
	dryRun?: boolean | undefined
}

const AGAINST_HINT =
	'Name the income or equity account that takes the difference, such as --against "Market gains"; "traj account add" creates one.'

/** The flag form needs all four: a missing one is named, and no date or account is ever chosen for the caller. */
function missing(input: ValueFlags): AppError | undefined {
	const required: [keyof ValueFlags, string, string | undefined][] = [
		["account", "name the account to value", undefined],
		["value", "state what the account is worth, as a decimal such as 125000.00", undefined],
		[
			"date",
			"state the date the value is stated for, as YYYY-MM-DD; traj reads no clock",
			undefined,
		],
		["against", "name the income or equity account that takes the difference", AGAINST_HINT],
	]
	for (const [field, sentence, hint] of required) {
		if (input[field] !== undefined) continue
		return fail("invalid_input", {
			path: field,
			message: `${field}: ${sentence}`,
			...(hint === undefined ? {} : { hint }),
		})
	}
	return undefined
}

/** `--template` prints a document and writes nothing, so it takes none of the other forms' flags. */
export function templateRefusal(input: ValueFlags): AppError | undefined {
	for (const field of ["account", "value", "date", "against"] as const) {
		if (input[field] === undefined) continue
		return fail("invalid_input", { path: field, message: `${field}: --template takes no ${field}` })
	}
	if (input.dryRun === true) {
		return fail("invalid_input", {
			path: "dryRun",
			message: "dryRun: --template takes no --dry-run",
		})
	}
	return undefined
}

/** Plans and writes one request inside one store transaction, then shapes what it wrote. */
function write<T>(
	ctx: Context,
	request: ValueRequest,
	dryRun: boolean,
	shape: (outcome: Parameters<typeof viewValue>[0]) => T,
): Result<T> | AppError {
	return withStore(ctx, (store) => {
		const outcome = store.writePlanned(planValues(request), { dryRun })
		return isAppError(outcome) ? outcome : ok(shape(outcome))
	})
}

/** `traj account value ACCOUNT --value --date --against`: one entry, the refusal its own envelope. */
export function valueOne(ctx: Context, input: ValueFlags): Result<ValueResult> | AppError {
	const wrong = missing(input)
	if (wrong !== undefined) return wrong
	const entry = { index: 0, account: input.account!, date: input.date!, value: input.value! }
	// A bad date wins over anything the ledger holds (ADR-0029), so it is checked before the store opens.
	const date = checkedDate(entry.date, "date")
	if (isAppError(date)) return date
	const request: ValueRequest = {
		against: input.against!,
		entries: [entry],
		path: (_index, field) => field,
		againstPath: "against",
		batch: false,
	}
	const dryRun = input.dryRun === true
	return write(ctx, request, dryRun, (outcome) => viewValue(outcome, dryRun))
}

/** `traj account value --file`: every entry in one transaction, or none of them. */
export function valueMany(
	ctx: Context,
	file: string,
	document: ValueDocument,
	dryRun: boolean,
): Result<ValuesResult> | AppError {
	const request: ValueRequest = {
		against: document.against,
		entries: document.values.map((entry, index) => ({ ...entry, index })),
		path: (index, field) => `document.values.${index}.${field}`,
		againstPath: "document.against",
		batch: true,
	}
	return write(ctx, request, dryRun, (outcome) => viewValues(outcome, file, dryRun))
}
