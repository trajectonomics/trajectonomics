import type { AccountGroup, AccountNode } from "../../lib/view/ledger/account-tree"
import { Badge } from "../ui/Badge"
import { DataTable } from "../ui/DataTable"
import { Money } from "../ui/Money"

const TYPE_LABELS: Readonly<Record<AccountGroup["type"], string>> = {
	asset: "Assets",
	liability: "Liabilities",
	equity: "Equity",
	income: "Income",
	expense: "Expenses",
}

/** The indent of each depth of the tree. Written out in full so Tailwind keeps every class. */
const INDENT = ["pl-0", "pl-5", "pl-10", "pl-14"] as const

export interface AccountTableProps {
	readonly group: AccountGroup
}

/** One account type's accounts as a table: the tree indented, and each leaf's balance. */
export function AccountTable({ group }: AccountTableProps) {
	return (
		<DataTable
			caption={TYPE_LABELS[group.type]}
			rows={group.nodes}
			rowKey={(node) => node.id}
			columns={[
				{ key: "account", header: "Account", cell: (node) => <AccountName node={node} /> },
				{
					key: "balance",
					header: "Balance",
					numeric: true,
					cell: (node) => <BalanceCell node={node} />,
				},
			]}
		/>
	)
}

function AccountName({ node }: { readonly node: AccountNode }) {
	const indent = INDENT[Math.min(node.depth, INDENT.length - 1)]
	return (
		<div className={`flex flex-wrap items-center gap-2 ${indent}`}>
			<span>{node.name}</span>
			{!node.leaf && <Badge>Header</Badge>}
			{node.archived && <Badge>Archived</Badge>}
		</div>
	)
}

function BalanceCell({ node }: { readonly node: AccountNode }) {
	if (!node.leaf) return null
	if (node.balances.length === 0) return <span className="text-muted-foreground">No balance</span>
	return (
		<div className="space-y-1">
			{node.balances.map((line) => (
				<Money key={line.currency} amount={line.amount} currency={line.currency} />
			))}
		</div>
	)
}
