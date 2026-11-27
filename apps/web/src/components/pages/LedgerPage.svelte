<script lang="ts">
import AccountsSection from "../ledger/AccountsSection.svelte"
import PnlSection from "../ledger/PnlSection.svelte"
import TransactionsSection from "../ledger/TransactionsSection.svelte"
import TrialBalanceSection from "../ledger/TrialBalanceSection.svelte"
import PageShell from "../ui/PageShell.svelte"

interface Props {
	/** The account filter of the transactions. The route file keeps it in the address bar. */
	account: string
	onAccount: (value: string) => void
}

let { account, onAccount }: Props = $props()
</script>

<!-- The Ledger: the accounts and their balances, the trial balance, profit and loss, and transactions. -->
<PageShell
	title="Ledger"
>
	{#snippet children(snapshot)}
		<div class="space-y-12">
			<AccountsSection accounts={snapshot.reads.accounts} balance={snapshot.reads.balance} />
			<TrialBalanceSection balance={snapshot.reads.balance} />
			<PnlSection pnl={snapshot.reads.pnl} />
			<TransactionsSection transactions={snapshot.reads.transactions} {account} {onAccount} />
		</div>
	{/snippet}
</PageShell>
