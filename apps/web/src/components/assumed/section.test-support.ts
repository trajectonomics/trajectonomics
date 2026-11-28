// The Demo's `base` plan with one item of each kind, and the Plan page's list of it, for this folder's tests.
import { render } from "svelte/server"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import type { AssumedItem, Snapshot } from "../../lib/contract"
import {
	allowance,
	filled,
	taxFigure,
	unlabelled,
} from "../../lib/view/assumed/fixtures.test-support"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import AssumedSection from "./AssumedSection.svelte"

/** The Demo's Snapshot, in which `base` assumes these items. */
function assuming(assumed: AssumedItem[] | undefined): Snapshot {
	const snapshot = structuredClone(DEMO)
	const read = snapshot.reads.documents["base"]
	if (read?.ok !== true) throw new Error("the Demo has no base plan")
	read.data.scenario.assumed = assumed
	return snapshot
}

const base = DEMO.reads.documents["base"]
if (base?.ok !== true) throw new Error("the Demo has no base plan")
const [asset] = base.data.scenario.document.accounts.filter((one) => one.kind === "asset")
if (asset === undefined) throw new Error("the Demo has no asset")
/** An asset Account of `base`. */
export const held = asset

export const ITEMS: AssumedItem[] = [
	filled("economy.inflation", 0),
	filled(`accounts.${held.id}.rate`, 150),
	filled("accounts.condo-loan.rate", 700),
	filled("flows.salary.amount", "52000.00"),
	unlabelled("condo-rent"),
	allowance("lifeInsurance"),
	taxFigure("allowances.mortgageInterestCeiling", "Home-loan interest ceiling, baht."),
]

/** The section's markup, without the comments the server renderer leaves. */
export function body(
	assumed: AssumedItem[] | undefined,
	plan: string | null = "base",
	editable = false,
): string {
	const snapshot = assuming(assumed)
	replaceSnapshot(snapshot)
	const props = { snapshot, plan, editable }
	return render(AssumedSection, { props }).body.replaceAll(/<!--.*?-->/g, "")
}
