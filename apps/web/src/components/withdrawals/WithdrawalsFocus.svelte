<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import type { ProjectionChance, ProjectionRun, Read } from "../../lib/contract"
import type { Terms } from "../../lib/view/projection/terms"
import { withdrawalsView } from "../../lib/view/withdrawals"
import { withdrawalsFocusView } from "../../lib/view/withdrawals/focus"
import { cx } from "../ui/cx"
import FocusAnswer from "../ui/FocusAnswer.svelte"
import FocusPoint from "../ui/FocusPoint.svelte"
import Money from "../ui/Money.svelte"
import ReadView from "../ui/ReadView.svelte"

interface Props {
	read: Read<ProjectionRun>
	/** The plan's chance read, when the Snapshot has one. */
	chance: Read<ProjectionChance> | undefined
	terms: Terms
	/** The plan the projection is of, which names the Read in an error. */
	plan: string
}

/** The page's focus point: the first spending rule's years as columns, its first year's amount on the first. */
let { read, chance, terms, plan }: Props = $props()
const view = $derived(
	withdrawalsView(read.ok ? read.data : null, chance?.ok === true ? chance.data : null),
)
</script>

<ReadView {read} label={`The projection of ${plan}`}>
	{#snippet children()}
		{@const focus = withdrawalsFocusView(view, terms, preferences.hidden)}
		{#if focus}
			<FocusPoint label={focus.label}>
				{#snippet visual(tone)}
					<div class="flex min-h-[220px] w-full flex-col justify-end">
						<div class="min-h-12 shrink-0">
							<FocusAnswer {tone}><Money
									amount={focus.amount}
									currency={focus.currency}
									compact
								/></FocusAnswer>
						</div>
						<div class="flex h-[150px] w-full items-end gap-1 pt-2">
							{#each focus.heights as height, index (index)}
								<span class="flex h-full flex-1 items-end">
									<span
										class={cx(
											"w-full rounded-t-sm",
											index === 0
												? "bg-accent print:bg-foreground/40"
												: "bg-foreground/20",
										)}
										style:height="{height}%"
									></span>
								</span>
							{/each}
						</div>
						<p class="mt-2 text-xs text-muted-foreground tabular-nums">{focus.first}</p>
					</div>
				{/snippet}
			</FocusPoint>
		{/if}
	{/snippet}
</ReadView>
