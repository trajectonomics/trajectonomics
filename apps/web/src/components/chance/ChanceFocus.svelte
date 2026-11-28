<script lang="ts">
import type { ProjectionChance, Read } from "../../lib/contract"
import { chanceFocusView } from "../../lib/view/chance/focus"
import ChanceGrid from "../overview/ChanceGrid.svelte"
import FocusAnswer from "../ui/FocusAnswer.svelte"
import FocusPoint from "../ui/FocusPoint.svelte"
import ReadView from "../ui/ReadView.svelte"

interface Props {
	read: Read<ProjectionChance>
	/** The plan the chance is of, which names the Read in an error. */
	plan: string
}

/** The page's focus point: one square per market path, the lasting ones filled, and the chance beside them. */
let { read, plan }: Props = $props()
</script>

<ReadView {read} label={`Chance of success for ${plan}`}>
	{#snippet children(data)}
		{@const focus = chanceFocusView(data)}
		<FocusPoint label={focus.label}>
			{#snippet visual(tone)}
				<div class="flex min-h-[200px] w-full flex-col justify-center gap-2">
					<ChanceGrid counts={focus} size="lg" />
					<div class="flex items-baseline justify-between gap-2">
						<p class="min-w-0 text-xs text-muted-foreground tabular-nums">
							To {focus.endYear} · {focus.succeeded} of {focus.paths}
						</p>
						<FocusAnswer {tone}>{focus.share}</FocusAnswer>
					</div>
				</div>
			{/snippet}
		</FocusPoint>
	{/snippet}
</ReadView>
