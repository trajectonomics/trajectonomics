import { AccountsSection } from "../ledger/AccountsSection"
import { PnlSection } from "../ledger/PnlSection"
import { TransactionsSection } from "../ledger/TransactionsSection"
import { TrialBalanceSection } from "../ledger/TrialBalanceSection"
import { PageShell } from "../ui/PageShell"

/** The Ledger: the accounts and their balances, the trial balance, profit and loss, and transactions. */
export function LedgerPage() {
	return (
		<PageShell
			title="Ledger"
			intro="The chart of accounts with its balances, the trial balance, profit and loss, and the transactions in this Snapshot."
			render={(snapshot) => (
				<div className="space-y-12">
					<AccountsSection accounts={snapshot.reads.accounts} balance={snapshot.reads.balance} />
					<TrialBalanceSection balance={snapshot.reads.balance} />
					<PnlSection pnl={snapshot.reads.pnl} />
					<TransactionsSection transactions={snapshot.reads.transactions} />
				</div>
			)}
		/>
	)
}
