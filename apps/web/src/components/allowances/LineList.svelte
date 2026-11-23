<script lang="ts">
import type { LineView } from "../../lib/view/allowances"
import Money from "../ui/Money.svelte"

interface Props {
	lines: readonly LineView[]
	currency: string
}

let { lines, currency }: Props = $props()
</script>

<!-- One allowance per card: what is planned, how much more fits, what it saves, and why it stopped. -->
<ul class="space-y-3">
	{#each lines as line (line.key)}
		<li class="rounded-md border border-border p-3 text-sm">
			<p class="font-medium">{line.name}</p>
			{#if line.ssf}
				<p class="mt-1 text-muted-foreground">{line.why}</p>
			{:else}
				<dl class="mt-2 grid grid-cols-3 gap-2">
					<div><dt class="text-muted-foreground">Planned</dt><dd><Money amount={line.planned} {currency} /></dd></div>
					<div><dt class="text-muted-foreground">Could take more</dt><dd><Money amount={line.extra} {currency} /></dd></div>
					<div><dt class="text-muted-foreground">Saves</dt><dd><Money amount={line.saving} {currency} /></dd></div>
				</dl>
				<p class="mt-2 text-muted-foreground">{line.why}</p>
				{#if line.hint}<p class="mt-1">{line.hint}</p>{/if}
			{/if}
		</li>
	{/each}
</ul>
