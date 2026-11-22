<script lang="ts">
import type { BestCaseView } from "../../lib/view/fi/model"
import Money from "../ui/Money.svelte"

interface Props {
	best: BestCaseView
	currency: string
}

/** The best case an unreachable answer names: the month, and the run-out or the buffer breach. */
let { best, currency }: Props = $props()
const headingId = $props.id()
</script>

<section aria-labelledby={headingId} class="space-y-2 rounded-lg border border-border p-4">
	<h2 id={headingId} class="text-base font-semibold">Best case</h2>
	<p class="text-sm">If earned income stopped in {best.month}:</p>
	{#if best.kind === "runsOut"}
		<p class="text-sm">
			the money runs out on {best.date}, with <Money amount={best.unmet} {currency} /> unmet.
		</p>
	{:else}
		<p class="text-sm">
			accessible net worth falls short of the buffer on {best.date}: required
			<Money amount={best.required} {currency} />, accessible
			<Money amount={best.accessible} {currency} />.
		</p>
	{/if}
</section>
