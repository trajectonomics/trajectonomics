import { useQueryParam } from "../../client/query-param"
import type { Snapshot } from "../../lib/contract"
import { parseTerms } from "../../lib/view/compare"
import { ComparePanel } from "../compare/ComparePanel"
import { PageShell } from "../ui/PageShell"

/** Compare: two Scenarios side by side, and the deltas the CLI states between them. */
export function ComparePage() {
	return (
		<PageShell
			title="Compare"
			intro="A is drawn solid and B dashed everywhere on this page. Each difference is B minus A, as the CLI states it."
			render={(snapshot) => <CompareReady snapshot={snapshot} />}
		/>
	)
}

/** The page once the Snapshot is ready: its terms live in the address bar, so a link keeps them. */
function CompareReady({ snapshot }: { readonly snapshot: Snapshot }) {
	const [raw, setRaw] = useQueryParam("terms", "nominal")
	return (
		<ComparePanel
			compare={snapshot.reads.compare}
			projections={snapshot.reads.projections}
			terms={parseTerms(raw)}
			onTerms={setRaw}
		/>
	)
}
