<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import type { ProjectionAllowances, ProjectionRun, Read } from "../../lib/contract"
import { dropLeadingMinus } from "../../lib/format/direction"
import { taxFocusView } from "../../lib/view/tax/focus"
import { cx } from "../ui/cx"
import FocusAnswer from "../ui/FocusAnswer.svelte"
import FocusPoint from "../ui/FocusPoint.svelte"
import Money from "../ui/Money.svelte"
import ReadView from "../ui/ReadView.svelte"

interface Props {
	read: Read<ProjectionRun>
	/** The plan's allowances read, when the Snapshot has one: it states the tax a person could still save. */
	allowances?: Read<ProjectionAllowances> | undefined
	/** The plan the tax is of, which names the Read in an error. */
	plan: string
}

/** The page's focus point: the year's income as one bar split by bracket, the tax owed at its end. */
let { read, allowances, plan }: Props = $props()
const allowancesData = $derived(allowances?.ok === true ? allowances.data : null)
</script>

<ReadView {read} label={`The tax of ${plan}`}>
	{#snippet children(run)}
		{@const focus = taxFocusView(run, allowancesData, preferences.hidden)}
		{#if focus}
			<FocusPoint label={focus.label} action={focus.action}>
				{#snippet visual(tone)}
					<div class="flex min-h-[200px] w-full flex-col justify-center gap-3">
						<div class="flex justify-end">
							<FocusAnswer {tone}>
								{#if focus.refund}<span
										class="mr-2 align-middle text-base font-medium text-muted-foreground"
										>Refund</span
									>{/if}<Money
									amount={focus.refund ? dropLeadingMinus(focus.owed) : focus.owed}
									currency={focus.currency}
									compact
								/>
							</FocusAnswer>
						</div>
						<div class="flex h-16 w-full gap-px overflow-hidden rounded-sm">
							{#each focus.segments as segment, index (index)}
								<span
									class={cx(
										"h-full",
										segment.top ? "bg-accent print:bg-foreground/30" : "bg-foreground/20",
									)}
									style:width="{segment.share * 100}%"
								></span>
							{/each}
						</div>
						<p class="text-right text-xs text-muted-foreground">Due {focus.due}</p>
					</div>
				{/snippet}
			</FocusPoint>
		{/if}
	{/snippet}
</ReadView>
