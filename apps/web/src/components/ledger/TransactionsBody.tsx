import type { Read, TxList } from "../../lib/contract"
import {
	accountOptions,
	describePeriod,
	filterTransactions,
	type TransactionFilter,
	type TransactionRow,
	transactionRows,
} from "../../lib/view/ledger/transactions"
import { EmptyState } from "../ui/EmptyState"
import { Provenance } from "../ui/Provenance"
import { ReadView } from "../ui/ReadView"
import { TransactionCards } from "./TransactionCards"
import { TransactionFilters } from "./TransactionFilters"
import { TransactionTable } from "./TransactionTable"

export interface TransactionsBodyProps {
	readonly read: Read<TxList>
	readonly filter: TransactionFilter
	readonly onAccount: (value: string) => void
	readonly onMemo: (value: string) => void
}

/** The transactions Read as a filterable table, with its period and its command. */
export function TransactionsBody({ read, filter, onAccount, onMemo }: TransactionsBodyProps) {
	return (
		<ReadView
			read={read}
			label="The transactions"
			render={(list) => {
				const rows = transactionRows(list)
				const shown = filterTransactions(rows, filter)
				return (
					<div className="space-y-4">
						<TransactionFilters
							options={accountOptions(rows, filter.account)}
							account={filter.account}
							memo={filter.memo}
							onAccount={onAccount}
							onMemo={onMemo}
						/>
						<Summary read={read} shown={shown.length} total={rows.length} />
						<Body
							rows={rows}
							shown={shown}
							onClear={() => {
								onAccount("")
								onMemo("")
							}}
						/>
						<Provenance argv={read.argv} />
					</div>
				)
			}}
		/>
	)
}

function Summary({ read, shown, total }: { read: Read<TxList>; shown: number; total: number }) {
	return (
		<p className="text-sm text-muted-foreground">
			{`Showing ${shown} of ${total} transactions, from ${describePeriod(read.argv)}.`}
		</p>
	)
}

interface BodyProps {
	readonly rows: readonly TransactionRow[]
	readonly shown: readonly TransactionRow[]
	readonly onClear: () => void
}

function Body({ rows, shown, onClear }: BodyProps) {
	if (rows.length === 0) {
		return (
			<EmptyState title="No transactions in this period">
				<p>The Snapshot holds no transaction between its two dates.</p>
			</EmptyState>
		)
	}
	if (shown.length === 0) {
		return (
			<EmptyState title="No transaction matches these filters">
				<button
					type="button"
					onClick={onClear}
					className="text-accent underline-offset-4 hover:underline"
				>
					Clear the filters
				</button>
			</EmptyState>
		)
	}
	return (
		<>
			<div className="hidden sm:block">
				<TransactionTable rows={shown} />
			</div>
			<div className="sm:hidden">
				<TransactionCards rows={shown} />
			</div>
		</>
	)
}
