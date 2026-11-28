import type { ScenarioDocument } from "../document"
import { printedCommand } from "../hint-command"
import type { Household } from "../household/model"
import { formatPath } from "../path"
import { hasFilerLevy } from "../tax/filer-label-check"
import type { TaxProfileView } from "../tax/profile"
import type { UnstatedAllowance } from "./shape"
import { earnersOf, filersOf, unlabelledFlowsOf } from "./unlabelled-flows"
import { taxForm } from "./unlabelled-forms"

/** The classes that arrive as a labelled contribution Flow rather than as a `scenario tax` flag. */
const CONTRIBUTION_CLASSES: ReadonlySet<string> = new Set(["retirementContributions", "thaiEsg"])

/**
 * The sentence that makes an Owner a Filer through an unlabelled income Flow's salary label
 * (cli ADR-0075, ADR-0083), or empty when every person is already one.
 */
function filerRoute(name: string, document: ScenarioDocument, household: Household | null): string {
	const filers = filersOf(household, document)
	const person = earnersOf(household).find((id) => !filers.has(id))
	if (person === undefined) return ""
	const flow = unlabelledFlowsOf(household, document).find((entry) => entry.owner === person)
	const ids = flow === undefined ? ["<flow id>"] : [flow.id]
	const form = taxForm(name, document, ids, true)
	if (flow === undefined) {
		return ` An Owner who is not yet a Filer has no income the Levy taxes, so add an income Flow for them first, then run "${form}".`
	}
	return ` An Owner who is not yet a Filer has no income the Levy taxes, so label an income Flow of theirs first: run "${form}".`
}

/** The command that states one contribution class, with the Owner note a Levy over Filers needs. */
function contributionHint(
	name: string,
	document: ScenarioDocument,
	household: Household | null,
): string {
	const command = printedCommand("traj scenario apply", [name], ["--add", "flows=<json>"])
	const owner = hasFilerLevy(document)
		? ` This plan's Levy reads Filer labels, so the label needs the Flow's Owner's Filer suffix (@<owner>) and the household must give the Flow that Owner.${filerRoute(name, document, household)}`
		: ""
	return `Add a contribution Flow with its label: run "${command}"; "traj schema scenario apply" shows the shape, and its target must be in cashflow.contribute.${owner}`
}

/** The command that states one flag class, with where the flag goes when the name follows `--`. */
function flagHint(name: string): string {
	const command = printedCommand("traj scenario tax", [name], ["--merge"])
	const placed = name.startsWith("-") ? " (before --)" : ""
	return `Run "${command}" with this allowance's flag added right after --merge${placed} to state it; "traj schema scenario tax" lists the flags. --merge needs every income Flow labelled first.`
}

/**
 * Each deduction class the plan leaves out, in `TAX_ALLOWANCE_CLASSES` order: the order of the
 * `notStated` list `taxAllowancesOf` reports (cli ADR-0073, ADR-0083). A plan with no stored profile
 * has no such list, so it has no items.
 */
export function unstatedAllowanceItems(
	name: string,
	taxAllowances: TaxProfileView | undefined,
	document: ScenarioDocument,
	household: Household | null,
): UnstatedAllowance[] {
	if (taxAllowances === undefined) return []
	return taxAllowances.notStated.map((className) => ({
		kind: "unstated-allowance" as const,
		path: formatPath(["taxAllowances", className]),
		value: null,
		hint: CONTRIBUTION_CLASSES.has(className)
			? contributionHint(name, document, household)
			: flagHint(name),
	}))
}
