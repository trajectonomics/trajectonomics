import { Money } from "../ui/Money"
import { PageShell } from "../ui/PageShell"
import { ReadView } from "../ui/ReadView"
import { Stat } from "../ui/Stat"

/** The Ledger: balances, the trial balance, profit and loss, and recent transactions. Placeholder. */
export function LedgerPage() {
	return (
		<PageShell
			title="Ledger"
			intro="The chart of accounts with its balances, the trial balance, profit and loss, and recent transactions."
			render={(snapshot) => (
				<ReadView
					read={snapshot.reads.pnl}
					label="Profit and loss"
					render={(data) => (
						<Stat
							label="Profit and loss, year to date"
							value={data.totals.map((total) => (
								<Money
									key={total.currency}
									amount={total.amount}
									currency={total.currency}
									signed
								/>
							))}
						/>
					)}
				/>
			)}
		/>
	)
}
