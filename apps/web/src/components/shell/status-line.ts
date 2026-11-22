import type { Snapshot } from "../../lib/contract"
import { headerLine } from "../../lib/view/header"

/** The line under the brand for a ready Snapshot: "As of …", the currency and the traj version. */
export function statusLine(snapshot: Snapshot): string {
	const line = headerLine(snapshot)
	const parts = [`As of ${line.asOf}`, line.currency, `traj ${line.cliVersion}`]
	return parts.filter((part): part is string => part !== null).join(" · ")
}
