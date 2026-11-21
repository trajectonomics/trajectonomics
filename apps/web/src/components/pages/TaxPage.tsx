import { useQueryParam } from "../../client/query-param"
import type { Snapshot } from "../../lib/contract"
import { TaxPanel } from "../tax/TaxPanel"
import { PageShell } from "../ui/PageShell"

/** Tax: per Levy and tax year, what is owed, what was prepaid, and whether it is settled. */
export function TaxPage() {
	return (
		<PageShell
			title="Tax"
			intro="Each Levy's settlement period: what is due, prepaid and owed, and whether it is settled."
			render={(snapshot) => <TaxReady snapshot={snapshot} />}
		/>
	)
}

/** The page once the Snapshot is ready: the Scenario it shows lives in the address bar. */
function TaxReady({ snapshot }: { readonly snapshot: Snapshot }) {
	const [scenario, setScenario] = useQueryParam("scenario", "")
	return (
		<TaxPanel
			projections={snapshot.reads.projections}
			requested={scenario}
			onScenario={setScenario}
		/>
	)
}
