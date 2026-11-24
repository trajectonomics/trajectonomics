import { TH_LEVY_MEMBER_ONLY_LABELS } from "@trajectonomics/core/tax/th"
import { type AppError, fail } from "../errors"
import { isPlainObject } from "../json"

/*
 * The one rule of a Scenario document the CLI states and the engine does not (cli ADR-0067): an
 * employer's share carries none of the Thai Levy's contribution labels. The engine keeps a label an
 * opaque string, because other tax systems do tally an employer's share, and a Thai Levy sees only
 * summed tallies, so the refusal belongs here, where every plan reaches the engine.
 */

/** The code of a problem the CLI finds in a document itself. */
export type OwnCode = "EMPLOYER_MEMBER_LABEL"

/** One such problem, with the path inside the document, as the engine's own are. */
export type OwnProblem = { readonly code: OwnCode; readonly segments: readonly (string | number)[] }

/** The member-only labels, as the tax package lists them: every one is the member's own payment. */
const MEMBER_ONLY: ReadonlySet<string> = new Set(TH_LEVY_MEMBER_ONLY_LABELS)

/** Whether a code is one the CLI finds itself rather than the engine. */
export function isOwnCode(code: string): code is OwnCode {
	return code === "EMPLOYER_MEMBER_LABEL"
}

/** Whether a label is one only the member's own payment may carry. */
export function isMemberOnlyLabel(label: string): boolean {
	return MEMBER_ONLY.has(label)
}

/** Every employer Contribution that carries a label only the member's own payment may carry. */
export function ownProblems(value: unknown): OwnProblem[] {
	const flows = isPlainObject(value) ? value["flows"] : undefined
	if (!Array.isArray(flows)) return []
	return flows.flatMap((flow, index) =>
		isPlainObject(flow) &&
		flow["kind"] === "contribution" &&
		flow["funding"] === "employer" &&
		typeof flow["label"] === "string" &&
		isMemberOnlyLabel(flow["label"])
			? [{ code: "EMPLOYER_MEMBER_LABEL" as const, segments: ["flows", index, "label"] }]
			: [],
	)
}

/** The sentence and way out of an own problem, as the refusal table words the engine's. */
export function ownSentence(code: OwnCode): { message: string; hint: string } {
	return {
		message: `A Contribution with funding "employer" carries one of the Thai Levy's contribution labels (${[...MEMBER_ONLY].join(", ")}), and each of them is the member's own payment: the allowances are for what the member paid, never for the employer's share, so the label would lower tax by money the member never paid.`,
		hint: `Remove "label" from the employer Contribution (${code}), and label only the member's own Contribution.`,
	}
}

/** The sentences `--label` and the document's `label` field state about the labels an employer's share and a payout take. */
export const LABEL_RULES: readonly string[] = [
	"Each of those contribution labels is the member's own payment, so an employer Contribution (funding employer) takes none of them.",
	"An Account's payout is labelled in the Account's own `payout.label`: a payout from a dividend Account is income.section40_4.dividends and one from interest is income.section40_4.interest.",
]

/** The refusal for `--label` writing a member's own label onto an employer Flow, or null when it does not. */
export function employerLabelProblem(
	target: Record<string, unknown>,
	label: string,
): AppError | null {
	if (target["funding"] !== "employer" || !isMemberOnlyLabel(label)) return null
	return fail("invalid_input", { ...ownSentence("EMPLOYER_MEMBER_LABEL"), path: "label" })
}
