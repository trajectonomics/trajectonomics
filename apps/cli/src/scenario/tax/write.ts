import { type Context, ok, type Result } from "../../command"
import { type AppError, fail, isAppError } from "../../errors"
import type { AssumptionView } from "../../tax-assumptions"
import { withStore } from "../../with-store"
import { scenarioNotFound } from "../errors"
import { view, type WrittenScenario } from "../view"
import { taxAssumptionsOf } from "./assumptions"
import type { TaxFlags } from "./flags"
import { type FlowLabel, flowLabelOf } from "./labels"
import { taxModeOf } from "./mode"
import { plannerOf, type Written } from "./plan"
import { type TaxProfileView, taxProfileOf } from "./profile"

/** What `scenario tax` returns: the row it wrote, and whether the write was rolled back. */
export type TaxWritten = {
	dryRun: boolean
	status: "created" | "updated" | "unchanged"
	/** The Levy id the write states; absent when --none wrote no Levy, or when it wrote several. */
	levy?: string | undefined
	/** The Levy ids a separate Return wrote, one per Filer; absent when it wrote one or none. */
	levies?: string[] | undefined
	/** The allowance classes the flags stated; absent when --none wrote no Levy. */
	allowances?: TaxProfileView | undefined
	/** The Filers of the Return the Levy is written over; absent when the plan keeps bare labels (cli ADR-0075). */
	filers?: string[] | undefined
	/** The unconfirmed tax figures the stored Levy would use; absent when --none wrote no Levy. */
	assumptions?: AssumptionView[] | undefined
	/** What the stored profile keeps that no Return of this write claims; absent when there is nothing. */
	unclaimed?: string[] | undefined
	scenario: WrittenScenario
}

/** The flags `scenario tax` takes, as the writer reads them. */
export type TaxInput = TaxFlags & {
	scenario: string
	label?: string[] | undefined
	dryRun?: boolean | undefined
	/** The content hash the caller read; the write is refused when the stored plan has another (cli ADR-0055). */
	ifHash?: string | undefined
}

/** The labels the caller declared, or the reason one cannot be read. */
function labelsOf(values: readonly string[]): FlowLabel[] | AppError {
	const labels: FlowLabel[] = []
	for (const value of values) {
		const label = flowLabelOf(value)
		if (isAppError(label)) return label
		labels.push(label)
	}
	return labels
}

/** `--none` removes the Levy and its labels, so a label to write is a contradiction. */
function noneWithLabel(input: TaxInput): AppError | null {
	if (input.none !== true || (input.label ?? []).length === 0) return null
	return fail("invalid_input", {
		path: "label",
		message: "--none removes the tax, so it cannot be combined with --label.",
	})
}

/** What a write that wrote a Levy reports of it; the Filers only when it has any. */
function writtenBy(made: Written): Omit<TaxWritten, "dryRun" | "status" | "scenario"> {
	const [only] = made.levies
	return {
		...(only !== undefined && made.levies.length === 1 ? { levy: only } : { levies: made.levies }),
		...(made.filers === undefined ? {} : { filers: made.filers }),
		allowances: taxProfileOf(made.request, made.document),
		assumptions: taxAssumptionsOf(made.document, made.separateLoans),
		...(made.unclaimed.length === 0 ? {} : { unclaimed: made.unclaimed }),
	}
}

/** The one write `scenario tax` makes, with every refusal ahead of it. */
export function writeTax(input: TaxInput, ctx: Context): Result<TaxWritten> | AppError {
	const mode = taxModeOf(input)
	if (isAppError(mode)) return mode
	const contradictory = noneWithLabel(input)
	if (contradictory !== null) return contradictory
	const labels = labelsOf(input.label ?? [])
	if (isAppError(labels)) return labels
	const dryRun = input.dryRun === true
	return withStore(ctx, (store) => {
		const row = store.getScenario(input.scenario)
		if (isAppError(row)) return row
		if (row === null) return scenarioNotFound(input.scenario, "scenario")
		let written: Written | null = null
		const outcome = store.replaceTax(
			row.id,
			plannerOf(mode, labels, (done) => {
				written = done
			}),
			{ dryRun, expectedHash: input.ifHash },
		)
		if (isAppError(outcome)) return outcome
		if (outcome.status === "not_found") return scenarioNotFound(input.scenario, "scenario")
		const scenario = view(outcome.scenario)
		const made = written as Written | null
		return ok({
			dryRun,
			status: outcome.status,
			...(made === null ? {} : writtenBy(made)),
			scenario,
		})
	})
}
