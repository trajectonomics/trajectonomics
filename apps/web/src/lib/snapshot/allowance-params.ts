/**
 * The inputs of the `projection allowances` reads: the labels in the person's order, the step, and the two
 * optional limits, kept as the text the person typed (the CLI parses every amount, cli ADR-0061). They live
 * in the Snapshot's parameters, not in the Scenario, so a change is a read and never a write.
 */
import { z } from "zod"
import type { ScenarioDocument } from "../contract"
import { KNOWN_LABELS } from "../contract/allowance-labels"
import { bareLabelOf } from "../edit/tax-labels"

const MESSAGE = {
	labels: "Choose at least one allowance, each once.",
	step: "Enter the step as a decimal number larger than one major unit, such as 1000.",
	budget: "Enter the yearly budget as a decimal number, or leave it empty.",
	minSaving: "Enter the least saving as a percent from 0 to 100, with at most two decimals.",
}

const decimal = /^\d{1,15}(\.\d{1,6})?$/
const percent = /^(100(\.0{1,2})?|\d{1,2}(\.\d{1,2})?)$/

/**
 * Whether a decimal text such as `1000` or `1.5` is larger than one. Text only, no arithmetic: more than one
 * digit before the point, or a digit from 2, or a 1 followed by a nonzero decimal. The CLI refuses the rest.
 */
export function largerThanOne(text: string): boolean {
	const [whole = "", fraction = ""] = text.split(".")
	const integer = whole.replace(/^0+/, "")
	if (integer.length > 1) return true
	if (integer === "") return false
	return integer !== "1" || /[1-9]/.test(fraction)
}

/** The allowance reads' inputs as the Snapshot states them: a limit the person left out is null. */
export const allowancePlan = z.strictObject({
	labels: z
		.array(z.string().refine((label) => KNOWN_LABELS.includes(label)))
		.min(1, MESSAGE.labels)
		.max(KNOWN_LABELS.length)
		.refine((labels) => new Set(labels).size === labels.length, MESSAGE.labels),
	step: z.string().regex(decimal, MESSAGE.step).refine(largerThanOne, MESSAGE.step),
	budget: z.string().regex(decimal, MESSAGE.budget).nullable(),
	minSaving: z.string().regex(percent, MESSAGE.minSaving).nullable(),
})

/** The allowance reads' inputs. */
export type AllowancePlan = z.infer<typeof allowancePlan>

/** The first rule the inputs break, as its code and the sentence a person reads, or null when they hold. */
export function checkAllowances(
	plan: AllowancePlan | null | undefined,
): { code: "invalid_allowances"; message: string } | null {
	if (plan === null || plan === undefined) return null
	const parsed = allowancePlan.safeParse(plan)
	if (parsed.success) return null
	return { code: "invalid_allowances", message: parsed.error.issues[0]?.message ?? MESSAGE.labels }
}

/** A Levy of a document, as much as the page reads: its `tally` measures' labels. */
function tallyLabels(levy: unknown): string[] {
	if (levy === null || typeof levy !== "object") return []
	const measures = (levy as { measures?: unknown }).measures
	if (!Array.isArray(measures)) return []
	return measures.flatMap((measure) => {
		if (measure === null || typeof measure !== "object") return []
		const { op, label } = measure as { op?: unknown; label?: unknown }
		return op === "tally" && typeof label === "string" ? [label] : []
	})
}

/** Whether a document's Levies tally a label under a Filer suffix, as the CLI's `hasFilerLevy` reads them. */
function hasFilerLevy(levies: readonly unknown[]): boolean {
	return levies.some((levy) => tallyLabels(levy).some((label) => bareLabelOf(label) !== label))
}

/**
 * Whether a plan's Return reads Filer labels: some Flow carries a tax label with its `@<filer>` suffix,
 * or a Levy's own `tally` measures do. The Levy is the rule of record once its labels are written (the
 * same rule as `hasFilerLevy` in `traj`, cli ADR-0075); a Flow-only plan is a Filer plan too.
 */
export function isFilerPlan(plan: ScenarioDocument | null | undefined): boolean {
	if (plan == null) return false
	const flow = plan.flows.some(
		(flow) => flow.label !== undefined && bareLabelOf(flow.label) !== flow.label,
	)
	return flow || hasFilerLevy(plan.levies ?? [])
}
