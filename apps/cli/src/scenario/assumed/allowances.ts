import type { ScenarioDocument } from "../document"
import { printedCommand } from "../hint-command"
import { formatPath } from "../path"
import { hasFilerLevy } from "../tax/filer-label-check"
import type { TaxProfileView } from "../tax/profile"
import type { UnstatedAllowance } from "./shape"

/** The classes that arrive as a labelled contribution Flow rather than as a `scenario tax` flag. */
const CONTRIBUTION_CLASSES: ReadonlySet<string> = new Set(["retirementContributions", "thaiEsg"])

/** The command that states one contribution class, with the Owner note a Levy over Filers needs. */
function contributionHint(name: string, filers: boolean): string {
	const command = printedCommand("traj scenario apply", [name], ["--add", "flows=<json>"])
	const tax = printedCommand("traj scenario tax", [name], ["--from-stored"])
	const owner = filers
		? ` This plan's Levy reads Filer labels, so the label needs the Flow's Owner's Filer suffix (@<owner>) and the household must give the Flow that Owner. The suffix must be one the Levy reads: an Owner who is not yet a Filer has no income it taxes, so label an income Flow of theirs and run "${tax}".`
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
): UnstatedAllowance[] {
	if (taxAllowances === undefined) return []
	const filers = hasFilerLevy(document)
	return taxAllowances.notStated.map((className) => ({
		kind: "unstated-allowance" as const,
		path: formatPath(["taxAllowances", className]),
		value: null,
		hint: CONTRIBUTION_CLASSES.has(className) ? contributionHint(name, filers) : flagHint(name),
	}))
}
