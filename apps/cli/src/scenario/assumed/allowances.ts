import { printedCommand } from "../hint-command"
import { formatPath } from "../path"
import type { TaxProfileView } from "../tax/profile"
import type { UnstatedAllowance } from "./shape"

/** The classes that arrive as a labelled contribution Flow rather than as a `scenario tax` flag. */
const CONTRIBUTION_CLASSES: ReadonlySet<string> = new Set(["retirementContributions", "thaiEsg"])

/** The command that states one class, chosen by how the class arrives (cli ADR-0083). */
function hintOf(name: string, className: string): string {
	if (CONTRIBUTION_CLASSES.has(className)) {
		const command = printedCommand("traj scenario apply", [name], ["--add", "flows=<json>"])
		return `Add a contribution Flow with its label: run "${command}"; "traj schema scenario apply" shows the shape, and its target must be in cashflow.contribute.`
	}
	const command = printedCommand("traj scenario tax", [name], ["--merge"])
	return `Run "${command}" with this allowance's flag to state it; "traj schema scenario tax" lists the flags. --merge needs every income Flow labelled first.`
}

/**
 * Each deduction class the plan leaves out, in `TAX_ALLOWANCE_CLASSES` order: the order of the
 * `notStated` list `taxAllowancesOf` reports (cli ADR-0073, ADR-0083). A plan with no stored profile
 * has no such list, so it has no items.
 */
export function unstatedAllowanceItems(
	name: string,
	taxAllowances: TaxProfileView | undefined,
): UnstatedAllowance[] {
	if (taxAllowances === undefined) return []
	return taxAllowances.notStated.map((className) => ({
		kind: "unstated-allowance" as const,
		path: formatPath(["taxAllowances", className]),
		value: null,
		hint: hintOf(name, className),
	}))
}
