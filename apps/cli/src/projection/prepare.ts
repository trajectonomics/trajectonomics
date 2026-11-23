import type { Baseline, Scenario, Timeline } from "@trajectonomics/core/sim"
import { BASELINE_CURRENCY } from "../baseline/kind"
import { type AppError, fail, isAppError } from "../errors"
import type { ScenarioDocument } from "../scenario/document"
import { scenarioNotFound } from "../scenario/errors"
import { householdDocument } from "../scenario/household/document"
import type { Household } from "../scenario/household/model"
import { applyScenarioSets } from "../scenario/set-apply"
import type { AppliedOverride } from "../scenario/set-error"
import type { Store } from "../store"
import { contentHash, supportedCurrency } from "../store"
import { canonicalJson } from "../store/canonical"
import { guard } from "../store/guard"
import { hasAnyLevy } from "./levies"
import type { ScenarioEcho, TaxStatus } from "./view"

/** What every projection leaf resolves before it runs the engine. */
export type Prepared = {
	/**
	 * The stored document after the applied Overrides, as the engine's own type. The CLI keeps a
	 * Scenario as JSON and never models it (ADR-0024); the engine validates it again on the way in.
	 */
	document: Scenario
	overrides: AppliedOverride[]
	/** The `--without` paths taken out before the Overrides, in command-line order (cli ADR-0056). */
	removals: string[]
	scenario: ScenarioEcho
	currency: string
	baseline: Baseline
	timeline: Timeline
	/** `applied` when the Scenario holds any Tax Levy, else `not_applied` (ADR-0032). */
	tax: TaxStatus
	/** The input field the Scenario's name came from, so a stored record names the flag. */
	scenarioPath: string
	/** The Scenario's household, parsed from its stored text; null when none is set (cli ADR-0048). */
	household: Household | null
}

/** The caller's side of one prepared Projection: which Scenario, from where, under which Sets. */
export type PrepareInput = {
	store: Store
	/**
	 * The Ledger's Baseline at `asOf`, mapped on first use. A compare maps it once for both sides,
	 * and a leaf that names a Scenario the store does not hold never maps it at all.
	 */
	baseline: () => Baseline | AppError
	/** The Scenario's name or id, as the caller typed it. */
	scenario: string
	/** The input field the name came from, so a miss names the flag or the positional. */
	scenarioPath: string
	asOf: string
	horizon: string
	sets: readonly string[]
	/** The `--without` paths, taken out before the Sets (cli ADR-0056). */
	without?: readonly string[] | undefined
	/** Whether each money amount of a Set is a decimal string (cli ADR-0047, ADR-0056). */
	decimal?: boolean | undefined
}

/**
 * A Scenario whose currency is not THB cannot be projected against a THB Baseline (ADR-0005), so
 * it is refused here rather than after the engine runs. A currency that is not a string at all is
 * the engine's own `WRONG_TYPE`, not the CLI's: the document is passed through untouched.
 */
function thbOnly(document: ScenarioDocument): AppError | null {
	const currency = document["currency"]
	if (typeof currency !== "string") return null
	return supportedCurrency(currency, "scenario.currency")
}

/**
 * Resolves one Scenario by name or id, applies the `--set` Overrides transiently (ADR-0024),
 * maps the Ledger's Balances at `asOf` (ADR-0026) and builds the Timeline. It never writes, and
 * it reads nothing the caller did not state (ADR-0030): the store, the Ledger and the flags are
 * its whole input.
 */
export function prepareProjection(input: PrepareInput): Prepared | AppError {
	const row = input.store.getScenario(input.scenario)
	if (isAppError(row)) return row
	if (row === null) return scenarioNotFound(input.scenario, input.scenarioPath)
	const applied = applyScenarioSets(JSON.parse(row.document) as ScenarioDocument, input.sets, {
		without: input.without,
		decimal: input.decimal,
	})
	if (isAppError(applied)) return applied
	const unsupported = thbOnly(applied.document)
	if (unsupported !== null) return unsupported
	const household = householdOfRow(row.household)
	if (isAppError(household)) return household
	const mapped = input.baseline()
	if (isAppError(mapped)) return mapped
	// The effective hash is the stored hash function applied to the document after the Overrides.
	// Canonicalising cannot fail on a stored document plus JSON values, but `guard` makes a bug in
	// that assumption an envelope rather than a throw.
	const effective = guard(() => contentHash(canonicalJson(applied.document)))
	if (isAppError(effective)) return effective
	// The effective document, before the Carry-in is placed: that is the projection's, not the plan's.
	const stored = applied.document as unknown as Scenario
	return {
		// The one place the stored JSON becomes the engine's type; `check()` reads it again.
		document: stored,
		overrides: applied.overrides,
		removals: applied.removals,
		scenario: {
			id: row.id,
			name: row.name,
			contentHash: row.contentHash,
			effectiveContentHash: effective,
		},
		currency: BASELINE_CURRENCY,
		baseline: mapped,
		timeline: { start: input.asOf, horizon: input.horizon, resolution: "month" },
		tax: hasAnyLevy(applied.document) ? "applied" : "not_applied",
		scenarioPath: input.scenarioPath,
		household,
	}
}

/** A stored household, parsed again: a row written by `scenario household` always parses. */
function householdOfRow(stored: string | null): Household | null | AppError {
	if (stored === null) return null
	const parsed = householdDocument.safeParse(JSON.parse(stored))
	if (!parsed.success) {
		return fail("internal", { message: "The stored household does not parse as a household." })
	}
	return parsed.data
}
