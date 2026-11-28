<script lang="ts">
import type { CashflowFocus } from "../../lib/view/cashflow/focus"

interface Props {
	/** The year's uses, or its money in against a shortfall, as the focus point draws them. */
	focus: CashflowFocus
}

/** The year as one horizontal bar: filled uses, the left over accent, or a short year's outlined shortfall. */
let { focus }: Props = $props()
const shown = $derived(focus.segments.filter((segment) => segment.share > 0))
</script>

{#if focus.shortBar}
	<div class="flex h-14 w-full gap-px overflow-hidden rounded-sm">
		<span
			class="h-full bg-foreground/20 print:bg-foreground/30"
			style:width="{focus.shortBar.moneyIn * 100}%"
		></span>
		<span
			class="h-full border-2 border-accent print:border-foreground"
			style:width="{focus.shortBar.unmet * 100}%"
		></span>
	</div>
	<p class="mt-1 text-right text-xs text-accent print:text-foreground">short</p>
{:else if focus.emptyBar}
	<div class="h-px w-full bg-foreground/30"></div>
	<p class="mt-1 text-right text-xs text-muted-foreground">nothing in or out</p>
{:else}
	<div class="h-14 w-full overflow-hidden rounded-sm">
		<div class="flex h-full gap-px">
			{#each shown as segment (segment.key)}
				<span
					class={segment.accent
						? "h-full bg-accent print:bg-foreground/30"
						: "h-full bg-foreground/20 print:bg-foreground/15"}
					style:width="{segment.share * 100}%"
				></span>
			{/each}
		</div>
	</div>
	<div class="mt-1 flex gap-px text-xs text-muted-foreground">
		{#each shown as segment (segment.key)}
			<span class="min-w-0 truncate" style:width="{segment.share * 100}%">
				{segment.label ?? ""}
			</span>
		{/each}
	</div>
{/if}
