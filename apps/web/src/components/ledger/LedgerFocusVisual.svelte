<script lang="ts">
import { formatDate } from "../../lib/format"
import type { LedgerFocus } from "../../lib/view/ledger/focus"
import FocusAnswer from "../ui/FocusAnswer.svelte"

interface Props {
	/** The focus point's rows, and the window they sit on. */
	focus: LedgerFocus
	/** The height of one account's row, so every dot and name lines up. */
	rowHeight: number
}

/** The Ledger focus point's picture: one row per account, a dot on the Snapshot's window, its ends dated. */
let { focus, rowHeight }: Props = $props()
</script>

<div class="flex min-h-[200px] w-full flex-col justify-center gap-2">
	<div class="flex min-w-0 items-baseline justify-between gap-2">
		<span class="shrink-0 text-xs whitespace-nowrap text-muted-foreground">{focus.accounts} accounts</span>
		<FocusAnswer>
			{focus.newest === null ? `Not since ${formatDate(focus.start)}` : formatDate(focus.newest)}
		</FocusAnswer>
	</div>
	<div class="flex gap-3">
		<div class="w-24 shrink-0">
			{#each focus.rows as row (row.key)}
				<div class="flex items-center justify-end overflow-hidden" style:height="{rowHeight}px">
					<span class="truncate text-xs text-muted-foreground" title={row.name}>{row.name}</span>
				</div>
			{/each}
		</div>
		<div class="relative min-w-0 flex-1" style:height="{rowHeight * focus.rows.length}px">
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
						class={row.stale
							? "block size-2.5 rounded-full border-2 border-accent bg-background"
							: "block size-2.5 rounded-full bg-accent print:bg-foreground"}
					></span>
				</span>
				{#if row.last === null}
					<span
						class="absolute -translate-y-1/2 pl-2 text-xs text-muted-foreground"
						style:left="{4 + row.x * 92}%"
						style:top="{(index + 0.5) * rowHeight}px"
						>none since {formatDate(focus.start)}</span
					>
				{/if}
			{/each}
		</div>
	</div>
	<div class="flex gap-3">
		<div class="w-24 shrink-0"></div>
		<div
			class="flex min-w-0 flex-1 items-baseline justify-between gap-2 px-[4%] text-xs text-muted-foreground"
		>
			<span>{formatDate(focus.start)}</span>
			<span>As of {formatDate(focus.asOf)}</span>
		</div>
	</div>
</div>
