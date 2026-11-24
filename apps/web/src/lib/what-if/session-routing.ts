/** The change a Set of a whole routing list is, as the bar words it (web ADR 0021). */
import type { Change } from "./session-changes"

/** The words of a routing list tried whole: its rows are not repeated, as they hold the person's own targets and shares. */
const LABELS: Readonly<Record<string, string>> = {
	"cashflow.surplus": "What happens to money left over tried as edited",
	"cashflow.contribute": "Which savings come first tried as edited",
	"cashflow.withdraw": "What is drawn when money is short tried as edited",
}

/** The change a Set of this path is, or null when the path is not a routing list. */
export function routingChange(path: string): Change | null {
	const label = LABELS[path]
	return label === undefined ? null : { kind: "routing", path, label }
}
