import type { AmountRow } from "../../lib/contract"
import { accountTypeLabel } from "../../lib/view/net-worth/account-type"
import { DataTable } from "../ui/DataTable"
import { Money } from "../ui/Money"

export interface AccountsTableProps {
	readonly rows: readonly AmountRow[]
}

/** Every row of the net worth report: account, type and amount, as the CLI states them. */
export function AccountsTable({ rows }: AccountsTableProps) {
	return (
		<DataTable
			caption="Every account in net worth"
			rows={rows}
			rowKey={(row) => `${row.account.id}:${row.currency}`}
			columns={[
				{ key: "account", header: "Account", cell: (row) => row.account.name },
				{ key: "type", header: "Type", cell: (row) => accountTypeLabel(row.type) },
				{
					key: "amount",
					header: "Amount",
					numeric: true,
					cell: (row) => <Money amount={row.amount} currency={row.currency} />,
				},
			]}
		/>
	)
}
