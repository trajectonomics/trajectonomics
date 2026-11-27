<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import type { ProjectionAllowances, Read } from "../../lib/contract"
import { allowancesFocusView } from "../../lib/view/allowances/focus"
import FocusAnswer from "../ui/FocusAnswer.svelte"
import FocusPoint from "../ui/FocusPoint.svelte"
import Money from "../ui/Money.svelte"
import ReadView from "../ui/ReadView.svelte"

interface Props {
	read: Read<ProjectionAllowances>
	/** The plan the allowances are of, which names the Read in an error. */
	plan: string
}

/** The page's focus point: one bar per allowance, the part taken filled and the part left outlined. */
let { read, plan }: Props = $props()
</script>

<ReadView {read} label={`The tax allowances of ${plan}`}>
	{#snippet children(data)}
		{@const focus = allowancesFocusView(data, preferences.hidden)}
		{#if focus}
			<FocusPoint label={focus.label}>
				{#snippet visual(tone)}
					<div class="flex min-h-[200px] w-full flex-col justify-center gap-5 px-2">
						<div class="flex justify-end">
							<FocusAnswer {tone}><Money
									amount={focus.saving}
									currency={focus.currency}
									compact
								/></FocusAnswer>
						</div>
						{#each focus.bars as bar, index (index)}
							<div class="flex h-9 w-full overflow-hidden rounded-sm">
								<span class="h-full bg-accent print:bg-foreground/30" style:width="{bar.taken * 100}%"
								></span>
								<span
									class="h-full border border-dashed border-muted-foreground/50"
									style:width="{bar.left * 100}%"
								></span>
							</div>
						{/each}
					</div>
				{/snippet}
			</FocusPoint>
		{/if}
	{/snippet}
</ReadView>
