import type { AccountList, Balance, Read } from "../../lib/contract"
import { accountGroups } from "../../lib/view/ledger/account-tree"
import { Provenance } from "../ui/Provenance"
import { ReadView } from "../ui/ReadView"
import { AccountTable } from "./AccountTable"
import { ReportSection } from "./ReportSection"

export interface AccountsSectionProps {
	readonly accounts: Read<AccountList>
	readonly balance: Read<Balance>
}

/** The chart of accounts with each leaf's balance. A failed balance Read leaves the tree without amounts. */
export function AccountsSection({ accounts, balance }: AccountsSectionProps) {
	return (
		<ReportSection
			id="accounts"
			title="Accounts and balances"
			intro="Assets and expenses are positive; liabilities, equity and income are negative. These are the signs the ledger holds, shown as the CLI prints them. A header account takes no amount of its own."
		>
			{!balance.ok && <ReadView read={balance} label="Balances" render={() => null} />}
			<ReadView
				read={accounts}
				label="The chart of accounts"
				render={(list) => {
					const rows = balance.ok ? balance.data.rows : []
					const groups = accountGroups(list.accounts, rows)
					return (
						<div className="space-y-6">
							{groups.length === 0 ? (
								<p className="text-sm text-muted-foreground">The ledger has no accounts yet.</p>
							) : (
								groups.map((group) => <AccountTable key={group.type} group={group} />)
							)}
							<Provenance argv={accounts.argv} />
							{balance.ok && <Provenance argv={balance.argv} />}
						</div>
					)
				}}
			/>
		</ReportSection>
	)
}
