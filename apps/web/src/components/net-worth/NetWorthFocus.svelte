<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import type { Read } from "../../lib/contract"
import { netWorthFocusView } from "../../lib/view/net-worth/focus"
import type { HistoryView } from "../../lib/view/net-worth/page"
import type { NetWorthView } from "../../lib/view/net-worth/view"
import FocusAnswer from "../ui/FocusAnswer.svelte"
import FocusPoint from "../ui/FocusPoint.svelte"
import Money from "../ui/Money.svelte"
import ReadView from "../ui/ReadView.svelte"
import NetWorthHistory from "./NetWorthHistory.svelte"

interface Props {
	read: Read<NetWorthView>
	history: HistoryView
}

/** The page's focus point: the month-end line, its last point a large dot carrying today's total. */
let { read, history }: Props = $props()
const HEIGHT = 220
</script>

<ReadView {read} label="Net worth">
	{#snippet children(data)}
		{@const focus = netWorthFocusView(data, history, preferences.hidden)}
		{#if focus}
			<FocusPoint label={focus.label}>
				{#snippet sr()}
					<p>
						<Money amount={focus.total} currency={focus.currency} />
						{#each focus.others as one (one.currency)}
							<span>, <Money amount={one.amount} currency={one.currency} /></span>
						{/each}
					</p>
				{/snippet}
				{#snippet visual(tone)}
					{#if focus.points.length > 0}
						<NetWorthHistory
							points={focus.points}
							months={focus.months}
							total={focus.total}
							asOf={focus.asOf}
							currency={focus.currency}
							height={HEIGHT}
							{tone}
						/>
					{:else}
						<div class="flex min-h-[200px] w-full flex-col justify-center gap-2">
							<div class="flex justify-end">
								<FocusAnswer {tone}><Money
										amount={focus.total}
										currency={focus.currency}
										compact
									/></FocusAnswer>
							</div>
							<p class="text-right text-xs text-muted-foreground">As of {focus.asOf}</p>
						</div>
					{/if}
					{#if focus.others.length > 0}
						<ul class="mt-2 flex flex-wrap justify-end gap-x-4 text-lg tabular-nums">
							{#each focus.others as one (one.currency)}
								<li><Money amount={one.amount} currency={one.currency} /></li>
							{/each}
						</ul>
					{/if}
				{/snippet}
			</FocusPoint>
		{/if}
	{/snippet}
</ReadView>
