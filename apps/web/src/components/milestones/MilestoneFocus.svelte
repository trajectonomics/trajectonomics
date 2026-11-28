<script lang="ts">
import { currentItemNames } from "../../client/item-names.svelte.js"
import type { ProjectionChance, ProjectionRun } from "../../lib/contract"
import { milestoneFocusView } from "../../lib/view/milestones/focus"
import { pinAnchor } from "../../lib/view/milestones/focus-axis"
import FocusAnswer from "../ui/FocusAnswer.svelte"
import FocusPoint from "../ui/FocusPoint.svelte"
import ItemName from "../ui/ItemName.svelte"

interface Props {
	/** The projection run of the Scenario the page shows. */
	run: ProjectionRun
	/** The Snapshot's As-of: the timeline starts here, and a milestone before it is not ahead. */
	asOf: string
	/** The plan's chance read, when it states an age at a milestone. */
	chance: ProjectionChance | null
}

/** The page's focus point: the next milestone as a pin on the timeline from the As-of to the Horizon. */
let { run, asOf, chance }: Props = $props()
const focus = $derived(milestoneFocusView(run, asOf, chance, currentItemNames()))
const ANCHOR = {
	left: "left-0 text-left",
	centre: "left-1/2 -translate-x-1/2 text-center",
	right: "right-0 text-right",
} as const
</script>

{#if focus}
	<FocusPoint label={focus.label} tone={focus.tone}>
		{#snippet visual(tone)}
			<div class="flex min-h-[200px] w-full flex-col justify-center gap-3">
				<div class="flex min-w-0 justify-end">
					{#if focus.month}
						<FocusAnswer {tone}>{focus.month}</FocusAnswer>
					{:else if focus.unreachedId}
						<FocusAnswer {tone}><span class="wrap-anywhere"><ItemName
									kind="milestone"
									id={focus.unreachedId}
								/></span></FocusAnswer>
					{/if}
				</div>
				<div class="relative h-28 w-full overflow-hidden">
					<div class="absolute inset-x-0 top-[4.5rem] h-px bg-border"></div>
					{#each focus.pins as pin (pin.key)}
						<span
							class="absolute top-[4.5rem] -translate-x-1/2 -translate-y-1/2"
							style:left="{4 + pin.x * 92}%"
						>
							{#if pin.next}
								<span class="absolute bottom-full left-1/2 mb-2 h-3 w-px -translate-x-1/2 bg-accent"></span>
								<span class="block size-4 rounded-full bg-accent print:bg-foreground"></span>
								{#if focus.nextId}
									<span
										class="absolute bottom-full mb-6 max-w-[9rem] text-xs text-muted-foreground {ANCHOR[
											pinAnchor(pin.x)
										]}"
										data-pin-label={pinAnchor(pin.x)}
									>
										<span class="block truncate"
											><ItemName kind="milestone" id={focus.nextId} /></span
										>
										{#if focus.age !== null}
											<span class="block" data-focus-age>At {focus.age}</span>
										{/if}
									</span>
								{/if}
							{:else if pin.unreached}
								<span class="block size-2.5 rounded-full border border-muted-foreground bg-background"></span>
							{:else}
								<span class="absolute bottom-full left-1/2 h-2 w-px -translate-x-1/2 bg-border"></span>
								<span class="block size-2 rounded-full bg-muted-foreground"></span>
							{/if}
						</span>
					{/each}
					<div
						class="absolute top-20 right-[4%] left-[4%] flex justify-between text-xs text-muted-foreground"
					>
						<span>{focus.startYear}</span>
						<span>{focus.endYear}</span>
					</div>
				</div>
				{#if focus.mark}
					<p class="text-right text-xs text-muted-foreground">{focus.mark}</p>
				{/if}
			</div>
		{/snippet}
	</FocusPoint>
{/if}
