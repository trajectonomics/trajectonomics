<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import type { ProjectionRun, Read } from "../../lib/contract"
import type { EstateFigures } from "../../lib/view/estate/figures"
import { estateFocusView } from "../../lib/view/estate/focus"
import { cx } from "../ui/cx"
import FocusAnswer from "../ui/FocusAnswer.svelte"
import FocusPoint from "../ui/FocusPoint.svelte"
import Money from "../ui/Money.svelte"
import ReadView from "../ui/ReadView.svelte"

interface Props {
	read: Read<ProjectionRun>
	/** The estate of the date the page reads; the page draws its own empty state when it has none. */
	figures: EstateFigures | null
	/** The plan the estate is of, which names the Read in an error. */
	plan: string
}

/** The page's focus point: the gross estate walked through its deductions, what heirs receive at its end. */
let { read, figures, plan }: Props = $props()
</script>

<ReadView {read} label={`The estate of ${plan}`}>
	{#snippet children()}
		{@const focus = figures === null ? null : estateFocusView(figures, preferences.hidden)}
		{#if focus}
			<FocusPoint label={focus.label}>
				{#snippet visual(tone)}
					<div class="flex min-h-[200px] w-full flex-col justify-center gap-3">
						<div class="flex justify-end">
							<FocusAnswer {tone}><Money
									amount={focus.net}
									currency={focus.currency}
									compact
								/></FocusAnswer>
						</div>
						<div class="flex h-16 w-full gap-px overflow-hidden rounded-sm">
							{#each focus.segments as segment, index (index)}
								<span
									class={cx(
										"h-full",
										segment.heirs
											? "bg-accent print:bg-foreground/30"
											: "bg-foreground/15",
									)}
									style:width="{segment.share * 100}%"
								></span>
							{/each}
						</div>
						<p class="text-right text-xs text-muted-foreground tabular-nums">{focus.year}</p>
					</div>
				{/snippet}
			</FocusPoint>
		{/if}
	{/snippet}
</ReadView>
