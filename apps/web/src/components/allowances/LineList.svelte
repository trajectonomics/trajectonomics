<script lang="ts">
import type { LineView } from "../../lib/view/allowances"
import { NO_PEOPLE, type PersonNames, personText } from "../../lib/view/item-names"
import Money from "../ui/Money.svelte"

interface Props {
	lines: readonly LineView[]
	currency: string
	/** The household's people, so a Return over two spouses names each one's allowances. */
	people?: PersonNames
}

let { lines, currency, people = NO_PEOPLE }: Props = $props()
/** Whether the lines name more than one Filer: a joint Return over both spouses groups them under each name. */
const grouped = $derived(
	new Set(lines.flatMap((line) => (line.filer === null ? [] : [line.filer]))).size > 1,
)
</script>

<!-- One allowance per card: what is planned, how much more fits, what it saves, and why it stopped. -->
<ul class="space-y-3">
	{#each lines as line, index (line.key)}
		{#if grouped && line.filer !== null && line.filer !== lines[index - 1]?.filer}
			<li class="pt-1 text-sm font-medium">{personText(people, line.filer)}</li>
		{/if}
		<li class="rounded-md border border-border p-3 text-sm" data-cli>
			<p class="font-medium">{line.name}</p>
			{#if line.ssf}
				<p class="mt-1 text-muted-foreground">{line.why}</p>
			{:else}
				<dl class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
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
