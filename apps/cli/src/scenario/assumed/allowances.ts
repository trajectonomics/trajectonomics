import { formatPath } from "../path"
import { quotedName } from "../quoted-name"
import type { TaxProfileView } from "../tax/profile"
import type { UnstatedAllowance } from "./shape"

/** The classes that arrive as a labelled contribution Flow rather than as a `scenario tax` flag. */
const CONTRIBUTION_CLASSES: ReadonlySet<string> = new Set(["retirementContributions", "thaiEsg"])

/** The command that states one class, chosen by how the class arrives (cli ADR-0083). */
function hintOf(name: string, className: string): string {
	if (CONTRIBUTION_CLASSES.has(className)) {
		return `Add a contribution Flow with its label: run "traj scenario apply ${quotedName(name)} --add flows=<json>"; "traj schema scenario apply" shows the shape.`
	}
	return `Run "traj scenario tax ${quotedName(name)} --merge" with this allowance's flag to state it; "traj schema scenario tax" lists the flags.`
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
