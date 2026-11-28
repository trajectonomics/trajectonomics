<script lang="ts">
import type { FocusView } from "../../lib/view/overview/focus"
import { cx } from "../ui/cx"
import { ANSWER_TEXT } from "../ui/focus"
import SiteLink from "../ui/SiteLink.svelte"

interface Props {
	focus: FocusView
	/** The box's left edge, in the chart's pixels. */
	x: number
	/** The box's top edge, in the chart's pixels. */
	y: number
	/** The box's measured size, so the chart can keep its whole box clear of the line. */
	onmeasure?: ((box: { width: number; height: number }) => void) | undefined
}

/** The answer written on the chart, with the household's faces beside it, over a halo in the page's colour. */
let { focus, x, y, onmeasure }: Props = $props()
const HALO =
	"[text-shadow:0_0_3px_var(--ds-color-background),0_0_6px_var(--ds-color-background),0_0_2px_var(--ds-color-background)]"
let width = $state(0)
let height = $state(0)
$effect(() => {
	if (width > 0 && height > 0) onmeasure?.({ width, height })
})
</script>

<div
	data-focus-label
	bind:clientWidth={width}
	bind:clientHeight={height}
	class="pointer-events-none absolute z-10 {HALO}"
	style:left="{x}px"
	style:top="{y}px"
>
	<div
		class="flex flex-col gap-1 md:flex-row md:items-center"
		class:items-center={focus.plan === null}
		class:items-start={focus.plan !== null}
	>
		{#if focus.plan}
			<SiteLink
				data-focus-answer
				href="/fi/"
				class={cx(
					"block whitespace-nowrap",
					ANSWER_TEXT,
					"pointer-events-auto rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
					focus.kind === "runsOut" ? "text-accent print:text-foreground" : "text-foreground",
				)}>{focus.answer}</SiteLink
			>
		{:else}
			<span data-focus-answer class={cx("block", ANSWER_TEXT, "text-foreground")}>{focus.answer}</span>
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
