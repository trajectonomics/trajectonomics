import type { ScenarioDocument } from "../document"
import { formatPath } from "../path"
import { quotedName } from "../quoted-name"
import { isTaxed } from "../shown"
import { flowsOf } from "../tax/labels"
import type { UnlabelledIncome } from "./shape"

/**
 * The income Flows a taxed plan gives no label, in document order (cli ADR-0083). No Levy is told
 * about one, so its income never reaches the tax; the hint states a Section 40 label, or another one.
 */
export function unlabelledIncomeItems(
	name: string,
	document: ScenarioDocument,
): UnlabelledIncome[] {
	if (!isTaxed(document)) return []
	return flowsOf(document)
		.filter((flow) => flow["kind"] === "income" && typeof flow["label"] !== "string")
		.map((flow) => {
			const path = formatPath(["flows", String(flow["id"] ?? ""), "label"])
			return {
				kind: "unlabelled-income" as const,
				path,
				value: null,
				hint: `Run "traj scenario apply ${quotedName(name)} --set '${path}="income.section40_1"'" for a salary, or name another label from "traj schema scenario apply".`,
			}
		})
}
