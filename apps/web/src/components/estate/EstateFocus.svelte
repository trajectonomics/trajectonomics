<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import type { ProjectionRun, Read } from "../../lib/contract"
import type { EstateFigures } from "../../lib/view/estate/figures"
import { estateFocusView } from "../../lib/view/estate/focus"
import type { Terms } from "../../lib/view/projection/terms"
import { cx } from "../ui/cx"
import FocusAnswer from "../ui/FocusAnswer.svelte"
import FocusPoint from "../ui/FocusPoint.svelte"
import Money from "../ui/Money.svelte"
import ReadView from "../ui/ReadView.svelte"

interface Props {
	read: Read<ProjectionRun>
	/** The estate of the date the page reads; the page draws its own empty state when it has none. */
	figures: EstateFigures | null
	/** The terms the page shows: today's money draws the net alone, future money the deductions to it. */
	terms: Terms
	/** The plan the estate is of, which names the Read in an error. */
	plan: string
}

/** The page's focus point: the gross estate walked through its deductions, what heirs receive at its end. */
let { read, figures, terms, plan }: Props = $props()
</script>

<ReadView {read} label={`The estate of ${plan}`}>
	{#snippet children()}
		{@const focus = figures === null ? null : estateFocusView(figures, terms, preferences.hidden)}
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
						<div class="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
							<span>{focus.real ? "" : "gross"}</span>
							<span class="tabular-nums">{focus.year}</span>
						</div>
						{#if focus.emptyBar}
							<div class="h-px w-full bg-foreground/30"></div>
						{:else}
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
						{/if}
						<p class="text-xs text-muted-foreground">
							{focus.real ? "today's money" : focus.segments.map((one) => one.name).join(" · ")}
						</p>
					</div>
				{/snippet}
			</FocusPoint>
		{/if}
	{/snippet}
</ReadView>
