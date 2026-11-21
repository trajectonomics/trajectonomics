import { overviewView } from "../../lib/view/overview/view"
import { OverviewGrid } from "../overview/OverviewGrid"
import { PageShell } from "../ui/PageShell"

/** The Overview: the headline figures, each card linking to its page and naming its command. */
export function OverviewPage() {
	return (
		<PageShell
			title="Overview"
			intro="The headline figures of your ledger. Each card names the command that produced it."
			render={(snapshot) => <OverviewGrid view={overviewView(snapshot)} />}
		/>
	)
}
