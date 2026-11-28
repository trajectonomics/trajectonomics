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
/** The winner drawn last, so it stays on top where the two lines and dots meet. */
const drawn = $derived(
	focus ? [...focus.lines].sort((x, y) => (x.accent ? 1 : 0) - (y.accent ? 1 : 0)) : [],
)
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
						{#each drawn as line (line.key)}
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
					{#each drawn as line (line.key)}
						{#if line.dot}
							<span
								data-compare-dot
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
				</div>
				<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" data-compare-legend>
					{#each focus.lines as line (line.key)}
						<span data-compare-legend-item class="flex min-w-0 items-center gap-1.5">
							<svg width="20" height="6" viewBox="0 0 20 6" class="shrink-0" aria-hidden="true">
								<line
									x1="0"
									y1="3"
									x2="20"
									y2="3"
									stroke-width="2"
									stroke-dasharray={line.key === "b" ? "5 3" : undefined}
									class={line.accent
										? "stroke-accent print:stroke-foreground"
										: "stroke-muted-foreground"}
								/>
							</svg>
							<span class="max-w-[12rem] truncate">{line.name}</span>
						</span>
					{/each}
				</div>
			</div>
		{/snippet}
	</FocusPoint>
{/if}
