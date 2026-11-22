import { accountId } from "@trajectonomics/core/ledger"
import type { Scenario } from "@trajectonomics/core/sim"
import { BASELINE_CURRENCY, CROSSING } from "../baseline/kind"
import { baselineOf } from "../baseline/mapping"
import { type AppError, fail, isAppError } from "../errors"
import { firstTransactionDateOf } from "../report/record"
import type { AccountRow, Ledger } from "../store"
import { acceptedScenarioSchemaVersion } from "./document"

/**
 * The schema field a refusal names. The dispatch step rewrites it to `--as-of`, the flag the caller
 * typed, and strips the prefix from the message (ADR-0013).
 */
const AS_OF_FIELD = "asOf"

/**
 * The earned and spending Streams the template carries at zero. The Baseline states no run-rate
 * (ADR-0026), so there is nothing to derive them from; a zero Stream changes no figure, and the
 * caller edits the amount and, if needed, the start date (ADR-0044).
 */
function placeholderFlows(asOf: string): Omit<Scenario, "schemaVersion">["flows"] {
	return [
		{
			id: "salary",
			kind: "income",
			earned: true,
			amount: 0,
			frequency: "monthly",
			start: asOf,
			growth: "inflation",
		},
		{
			id: "spending",
			kind: "expense",
			amount: 0,
			frequency: "monthly",
			start: asOf,
			growth: "inflation",
		},
	]
}

/** Every asset and liability leaf, in id order: the Accounts a Scenario must declare (ADR-0044). */
function declaredAccounts(ledger: Ledger): AccountRow[] {
	return ledger.accounts
		.filter(
			(account) =>
				CROSSING[account.type] !== undefined && ledger.chart.isLeaf(accountId(account.id)),
		)
		.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

/**
 * The refusals that keep a template from being a document the Baseline could never apply. Each
 * names the command that fixes it, because the caller's next step is always one of those.
 */
function refusalOf(ledger: Ledger, asOf: string, assets: readonly AccountRow[]): AppError | null {
	const first = firstTransactionDateOf(ledger.transactions)
	if (first === null) {
		return fail("invalid_input", {
			path: AS_OF_FIELD,
			message: `${AS_OF_FIELD}: the Ledger records no Transaction yet`,
			hint: 'Run "traj tx add" to record a Transaction, then print the template again.',
		})
	}
	if (first > asOf) {
		return fail("invalid_input", {
			path: AS_OF_FIELD,
			message: `${AS_OF_FIELD}: the Ledger's first Transaction is on ${first}, after ${asOf}`,
			hint: `Run "traj scenario apply --template --as-of ${first}" to start from that date.`,
		})
	}
	if (assets.length === 0) {
		return fail("invalid_input", {
			path: AS_OF_FIELD,
			message: `${AS_OF_FIELD}: the Ledger holds no asset Account to route surplus into`,
			hint: 'Run "traj account add <name> --type asset --currency THB" to open one.',
		})
	}
	return null
}

/**
 * The Scenario document `scenario apply --template --as-of` prints: every asset and liability leaf
 * declared at a zero rate, the zero Streams, and the surplus, contribution and withdrawal order
 * over the assets. The Baseline's own checks run first, so a template is never printed for a
 * Ledger the Baseline refuses, and nothing is read from the clock or written to the store.
 */
export function baselineTemplateOf(ledger: Ledger, asOf: string): string | AppError {
	const mapping = baselineOf(ledger, asOf)
	if (isAppError(mapping)) return mapping
	const accounts = declaredAccounts(ledger)
	const assets = accounts.filter((account) => CROSSING[account.type] === "asset")
	const refused = refusalOf(ledger, asOf, assets)
	if (refused !== null) return refused
	const version = acceptedScenarioSchemaVersion()
	if (version === undefined) return fail("internal")
	const live = assets.find((account) => account.archivedAt === null) ?? assets[0]
	const assetIds = assets.map((account) => account.id)
	const document = {
		schemaVersion: version,
		currency: BASELINE_CURRENCY,
		economy: { inflation: 0 },
		accounts: accounts.map((account) => ({
			id: account.id,
			kind: CROSSING[account.type],
			rate: 0,
		})),
		flows: placeholderFlows(asOf),
		cashflow: {
			surplus: live === undefined ? [] : [{ account: live.id }],
			contribute: assetIds,
			withdraw: assetIds,
		},
	}
	return JSON.stringify(document, null, 2)
}
