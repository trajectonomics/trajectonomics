<script lang="ts">
import type { ProjectionCompare } from "../../lib/contract"
import { type ChartState, compareFocusView } from "../../lib/view/compare"
import { cx } from "../ui/cx"
import FocusAnswer from "../ui/FocusAnswer.svelte"
import FocusPoint from "../ui/FocusPoint.svelte"

interface Props {
	data: ProjectionCompare
	chart: ChartState
}

/** The page's focus point: both plans' lines, each FI date dotted, and the plan that stops soonest. */
let { data, chart }: Props = $props()
const focus = $derived(compareFocusView(data, chart))
const LABEL_Y = {
	top: "",
	middle: "-translate-y-1/2",
	bottom: "-translate-y-full",
} as const

/** A name at the very top or bottom of the box is anchored to that edge, so it never leaves the picture. */
function labelY(y: number): keyof typeof LABEL_Y {
	if (y <= 15) return "top"
	return y >= 85 ? "bottom" : "middle"
}
</script>

{#if focus}
	<FocusPoint label={focus.label} tone={focus.tone} action={focus.action ?? undefined}>
		{#snippet visual(tone)}
			<div class="flex min-h-[200px] w-full flex-col justify-center gap-3">
				<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
					{#if focus.winner}
						<span class="min-w-0 truncate text-xs text-muted-foreground">{focus.winner.name}</span>
					{/if}
					<span class="flex flex-wrap items-baseline justify-end gap-x-2 gap-y-1">
						{#if focus.winner}
							<FocusAnswer {tone}>{focus.winner.month}</FocusAnswer>
							{#if focus.gap !== null}
								<span class="text-xs text-muted-foreground">{focus.gap} mo sooner</span>
							{/if}
						{:else}
							<FocusAnswer {tone}>Not reached</FocusAnswer>
						{/if}
					</span>
				</div>
				<div class="relative h-40 w-full">
					<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="block h-full w-full">
						{#each focus.lines as line (line.key)}
							<polyline
								points={line.points}
								fill="none"
								stroke-width="2"
								stroke-linejoin="round"
								vector-effect="non-scaling-stroke"
								stroke-dasharray={line.key === "b" ? "5 3" : undefined}
								class={line.accent
									? "stroke-accent print:stroke-foreground"
									: "stroke-muted-foreground"}
							/>
						{/each}
					</svg>
					{#each focus.lines as line (line.key)}
						{#if line.dot}
							<span
								class={cx(
									"absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
									line.accent
										? "bg-accent print:bg-foreground"
										: "border border-muted-foreground bg-background",
								)}
								style:left="{line.dot.x}%"
								style:top="{line.dot.y}%"
							></span>
						{/if}
					{/each}
					{#each focus.lines as line (line.key)}
						<span
							class={cx(
								"absolute max-w-[45%] truncate text-xs text-muted-foreground",
								line.end.x > 50 ? "-translate-x-full pr-1" : "pl-1",
								LABEL_Y[labelY(line.end.y)],
							)}
							style:left="{line.end.x}%"
							style:top="{line.end.y}%"
						>
							{line.name}
						</span>
					{/each}
				</div>
			</div>
		{/snippet}
	</FocusPoint>
{/if}
