import { useState } from "react"
import { useQueryParam } from "../../client/query-param"
import type { Read, TxList } from "../../lib/contract"
import { ReportSection } from "./ReportSection"
import { TransactionsBody } from "./TransactionsBody"

export interface TransactionsSectionProps {
	readonly transactions: Read<TxList>
}

/** The loaded transactions, newest first. The account filter lives in the address bar. */
export function TransactionsSection({ transactions }: TransactionsSectionProps) {
	const [account, setAccount] = useQueryParam("account", "")
	const [memo, setMemo] = useState("")
	return (
		<ReportSection
			id="transactions"
			title="Transactions"
			intro="Newest first, each with its postings and their signed amounts. The filters only hide rows already loaded in this Snapshot."
		>
			<TransactionsBody
				read={transactions}
				filter={{ account, memo }}
				onAccount={setAccount}
				onMemo={setMemo}
			/>
		</ReportSection>
	)
}
