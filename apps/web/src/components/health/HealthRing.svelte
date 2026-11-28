<script lang="ts">
import type { HealthFocusCheck } from "../../lib/view/health/focus"

interface Props {
	/** Every check the doctor and the failed Reads state, in order. */
	checks: readonly HealthFocusCheck[]
}

/** The checks as one ring: one equal segment each, the failing ones accent and haloed. */
let { checks }: Props = $props()
const RADIUS = 104
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const SEGMENT = $derived(CIRCUMFERENCE / Math.max(1, checks.length))
const DASH = $derived(Math.max(0, SEGMENT - Math.min(6, SEGMENT * 0.2)))
</script>

<svg aria-hidden="true" viewBox="0 0 240 240" class="size-full">
	<g transform="rotate(-90 120 120)">
		{#each checks as check, index (check.key)}
			{#if !check.passed}
				<circle
					cx="120"
					cy="120"
					r={RADIUS}
					fill="none"
					stroke-width="30"
					class="stroke-accent/20 print:hidden"
					stroke-dasharray="{DASH} {CIRCUMFERENCE - DASH}"
					stroke-dashoffset={-index * SEGMENT}
				/>
			{/if}
		{/each}
		{#each checks as check, index (check.key)}
			<circle
				cx="120"
				cy="120"
				r={RADIUS}
				fill="none"
				stroke-width="14"
				class={check.passed
					? "stroke-muted-foreground/50 print:stroke-foreground/40"
					: "stroke-accent print:stroke-foreground"}
				stroke-dasharray="{DASH} {CIRCUMFERENCE - DASH}"
				stroke-dashoffset={-index * SEGMENT}
			/>
		{/each}
	</g>
</svg>
