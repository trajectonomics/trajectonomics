<script lang="ts">
import type { FocusView } from "../../lib/view/overview/focus"
import { cx } from "../ui/cx"
import SiteLink from "../ui/SiteLink.svelte"

interface Props {
	focus: FocusView
	/** The dot's x, in the chart's pixels. The label is placed beside it. */
	x: number
	/** The label's middle, in the chart's pixels. */
	y: number
	side: "left" | "right" | "center"
}

/** The answer written on the chart, with the household's faces beside it. */
let { focus, x, y, side }: Props = $props()
const ANSWER =
	"block font-bold tracking-tight whitespace-nowrap leading-none text-[clamp(1.875rem,4vw,2.75rem)]"
const transform = $derived(
	side === "left"
		? "translate(-100%, -50%)"
		: side === "center"
			? "translate(-50%, -50%)"
			: "translate(0, -50%)",
)
/** The label sits 10px beside the dot, so the dot stays visible against the answer's first letter. */
const left = $derived(side === "right" ? x + 10 : side === "left" ? x - 10 : x)
</script>

<div
	class="pointer-events-none absolute z-10"
	style:left="{left}px"
	style:top="{y}px"
	style:transform={transform}
>
	<div
		class="flex flex-col gap-1 md:flex-row md:items-center"
		class:items-center={side === "center"}
		class:items-start={side !== "center"}
	>
		{#if focus.plan}
			<SiteLink
				data-focus-answer
				href="/fi/"
				class={cx(
					ANSWER,
					"pointer-events-auto rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
					focus.kind === "runsOut" ? "text-accent print:text-foreground" : "text-foreground",
				)}>{focus.answer}</SiteLink
			>
		{:else}
			<span data-focus-answer class={cx(ANSWER, "text-foreground")}>{focus.answer}</span>
		{/if}
		{#if focus.faces.length > 0}
			<ul aria-hidden="true" class="flex items-center gap-2">
				{#each focus.faces as face (face.role)}
					<li class="flex items-center gap-1">
						<span class="flex size-[22px] items-center justify-center rounded-full bg-muted text-[11px] font-semibold">{face.initial}</span>
						<span class="text-sm font-semibold tabular-nums">{face.age}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
