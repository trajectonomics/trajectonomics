import { netWorthPageView } from "../../lib/view/net-worth/page"
import { NetWorthContent } from "../net-worth/NetWorthContent"
import { PageShell } from "../ui/PageShell"

/** Net worth: the headline, the month-end history, the composition by account and every row. */
export function NetWorthPage() {
	return (
		<PageShell
			title="Net worth"
			intro="Net worth at the As-of, its assets and liabilities by account, and its month-end history."
			render={(snapshot) => <NetWorthContent view={netWorthPageView(snapshot)} />}
		/>
	)
}
