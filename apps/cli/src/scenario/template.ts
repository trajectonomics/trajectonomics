import type { Context } from "../command"
import { ok, type Result } from "../command"
import { checkedAsOf } from "../date"
import { type AppError, fail, isAppError } from "../errors"
import { withLedger } from "../report/with-ledger"
import { baselineTemplateOf } from "./baseline-template"
import { acceptedScenarioSchemaVersion } from "./document"

/**
 * The document `--template` prints: one asset account, one monthly earned Stream, the surplus
 * routed to it, and empty contribution and withdrawal lists. Every key `check()` requires is here,
 * the amounts are integers of minor units, the Stream's start is a fixed date rather than the clock,
 * and there is no Levy, because `scenario tax` is the only command that writes one (ADR-0032).
 */
const TEMPLATE_DOCUMENT = {
	currency: "THB",
	economy: { inflation: 0 },
	accounts: [{ id: "cash", kind: "asset", rate: 0 }],
	flows: [
		{
			id: "salary",
			kind: "income",
			earned: true,
			amount: 100_000,
			frequency: "monthly",
			start: "2026-01-01",
			growth: "inflation",
		},
	],
	cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: [] },
} as const

/**
 * The template text, stamped with the version the pinned core accepts, or `undefined` when the pin
 * accepts none inside the scan's bound. `JSON.stringify` keeps the literal's key order, the text
 * carries no trailing newline of its own, and nothing here reads the clock, the environment or the
 * data directory, so one file is byte-identical on every host (ADR-0033).
 */
export function scenarioTemplate(): string | undefined {
	const version = acceptedScenarioSchemaVersion()
	if (version === undefined) return undefined
	return JSON.stringify({ schemaVersion: version, ...TEMPLATE_DOCUMENT }, null, 2)
}

/**
 * `scenario apply --template`: the static skeleton with no As-of, which opens no data directory,
 * or the Baseline's pre-fill at one As-of, which reads the Ledger and writes nothing (ADR-0044).
 * The As-of is checked before the store opens, so a bad date wins over a corrupt row (ADR-0029).
 */
export function printTemplate(ctx: Context, asOf: string | undefined): Result<string> | AppError {
	if (asOf === undefined) {
		const template = scenarioTemplate()
		return template === undefined ? fail("internal") : ok(template)
	}
	const checked = checkedAsOf(asOf)
	if (isAppError(checked)) return checked
	return withLedger(ctx, (ledger) => baselineTemplateOf(ledger, asOf))
}
