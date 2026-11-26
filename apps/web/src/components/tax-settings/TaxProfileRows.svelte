<script lang="ts">
import type { ProfileRow } from "../../lib/view/tax-settings/rows"
import MaskedAmount from "../ui/MaskedAmount.svelte"

interface Props {
	rows: readonly ProfileRow[]
}

let { rows }: Props = $props()
</script>

<dl class="space-y-1 text-sm">
	{#each rows as row (row.key)}
		<div class="flex justify-between gap-3 border-b border-border py-1 last:border-0">
			<dt class="text-muted-foreground">{row.label}</dt>
			<dd class="text-right font-medium text-foreground">{#if row.amount}<MaskedAmount digits={row.amount.digits} after={row.amount.after} />{:else}{row.value}{/if}</dd>
		</div>
	{/each}
</dl>
