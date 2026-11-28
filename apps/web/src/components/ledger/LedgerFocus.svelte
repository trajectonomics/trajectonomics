<script lang="ts">
import type { AccountList, Read, TxList } from "../../lib/contract"
import { formatDate } from "../../lib/format"
import { ledgerFocusView } from "../../lib/view/ledger/focus"
import FocusAnswer from "../ui/FocusAnswer.svelte"
import FocusPoint from "../ui/FocusPoint.svelte"

interface Props {
	/** The chart of accounts: one row per active account. */
	accounts: Read<AccountList>
	/** The transactions of the period: the last day each account was recorded. */
	transactions: Read<TxList>
}

/** The page's focus point: one row per account, a dot at its last record on a shared time axis. */
let { accounts, transactions }: Props = $props()
const focus = $derived(
	accounts.ok && transactions.ok ? ledgerFocusView(accounts.data, transactions.data) : null,
)
const ROW_MAX = 22
const ROWS_TOTAL = 240
const rowHeight = $derived(
	focus === null ? ROW_MAX : Math.min(ROW_MAX, ROWS_TOTAL / focus.rows.length),
)
</script>

{#if focus}
	<FocusPoint label={focus.label}>
		{#snippet visual()}
			<div class="flex min-h-[200px] w-full flex-col justify-center gap-2">
				<div class="flex min-w-0 items-baseline justify-between gap-2">
					<span class="text-xs text-muted-foreground">{focus.accounts} accounts</span>
					<FocusAnswer>{formatDate(focus.newest)}</FocusAnswer>
				</div>
				<div class="flex gap-3">
					<div class="w-24 shrink-0">
						{#each focus.rows as row (row.key)}
							<div
								class="flex items-center justify-end overflow-hidden"
								style:height="{rowHeight}px"
							>
								<span class="truncate text-xs text-muted-foreground" title={row.name}
									>{row.name}</span
								>
							</div>
						{/each}
					</div>
					<div
						class="relative min-w-0 flex-1"
						style:height="{rowHeight * focus.rows.length}px"
					>
						{#each focus.rows as row, index (row.key)}
							<span
								class="absolute inset-x-0 h-px bg-border/70"
								style:top="{(index + 0.5) * rowHeight}px"
							></span>
						{/each}
						{#each focus.rows as row, index (row.key)}
							<span
								class="absolute -translate-x-1/2 -translate-y-1/2"
								style:left="{4 + row.x * 92}%"
								style:top="{(index + 0.5) * rowHeight}px"
							>
								<span
									class={row.last === null
										? "block size-2.5 rounded-full border border-muted-foreground bg-background"
										: row.stale
											? "block size-2.5 rounded-full border-2 border-accent bg-background"
											: "block size-2.5 rounded-full bg-accent print:bg-foreground"}
								></span>
							</span>
							{#if row.last === null}
								<span
									class="absolute -translate-y-1/2 pl-2 text-xs text-muted-foreground"
									style:left="{4 + row.x * 92}%"
									style:top="{(index + 0.5) * rowHeight}px">none</span
								>
							{/if}
						{/each}
					</div>
				</div>
			</div>
		{/snippet}
	</FocusPoint>
{/if}
