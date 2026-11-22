<script lang="ts">
import type { Read, TxList } from "../../lib/contract"
import type { TransactionFilter } from "../../lib/view/ledger/transactions"
import ReportSection from "./ReportSection.svelte"
import TransactionsBody from "./TransactionsBody.svelte"

interface Props {
	transactions: Read<TxList>
	/** The account filter. The route file keeps it in the address bar and passes it down. */
	account: string
	onAccount: (value: string) => void
}

let { transactions, account, onAccount }: Props = $props()

// The memo filter is local to the page: only the account filter is kept in the address bar.
let memo = $state("")
const filter = $derived<TransactionFilter>({ account, memo })

function setMemo(value: string): void {
	memo = value
}
</script>

<!-- The loaded transactions, newest first. The account filter lives in the address bar. -->
<ReportSection
	id="transactions"
	title="Transactions"
	intro="Newest first, each with its postings and their signed amounts. The filters only hide rows already loaded in this Snapshot."
>
	<TransactionsBody read={transactions} {filter} {onAccount} onMemo={setMemo} />
</ReportSection>
