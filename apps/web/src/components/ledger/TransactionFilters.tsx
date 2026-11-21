import type { AccountOption } from "../../lib/view/ledger/transactions"

export interface TransactionFiltersProps {
	readonly options: readonly AccountOption[]
	readonly account: string
	readonly memo: string
	readonly onAccount: (value: string) => void
	readonly onMemo: (value: string) => void
}

const FIELD = "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"

/** The account choice and the memo search that narrow the loaded transactions. */
export function TransactionFilters({
	options,
	account,
	memo,
	onAccount,
	onMemo,
}: TransactionFiltersProps) {
	return (
		<div className="grid gap-3 sm:grid-cols-2">
			<label className="flex flex-col gap-1 text-sm">
				<span className="text-muted-foreground">Account</span>
				<select
					name="account"
					value={account}
					onChange={(event) => onAccount(event.currentTarget.value)}
					className={FIELD}
				>
					{options.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</label>
			<label className="flex flex-col gap-1 text-sm">
				<span className="text-muted-foreground">Memo contains</span>
				<input
					type="search"
					name="memo"
					value={memo}
					placeholder="Any memo"
					onChange={(event) => onMemo(event.currentTarget.value)}
					className={FIELD}
				/>
			</label>
		</div>
	)
}
