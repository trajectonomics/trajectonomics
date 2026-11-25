<script lang="ts">
import type { WalkLine } from "../../lib/view/tax"
import Money from "../ui/Money.svelte"

interface Props {
	lines: readonly WalkLine[]
	currency: string
}

let { lines, currency }: Props = $props()
</script>

<!-- How assessable income became taxable income, each figure the CLI's. -->
<section aria-labelledby="tax-walk-title" class="space-y-3">
	<h3 id="tax-walk-title" class="text-base font-semibold">From income to taxable income</h3>
	<dl class="space-y-2 rounded-lg border border-border p-4 text-sm">
		{#each lines as line (line.key)}
			<div
				class="flex justify-between gap-4 {line.key === 'taxable' ? 'border-t border-border pt-2 font-semibold' : ''}"
			>
				<dt>{line.less ? "Less " : ""}{line.less ? line.label.toLowerCase() : line.label}</dt>
				<dd><Money amount={line.amount} {currency} /></dd>
			</div>
		{/each}
	</dl>
</section>
