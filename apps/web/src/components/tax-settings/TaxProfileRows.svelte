<script lang="ts">
import type { TaxProfile } from "../../lib/contract"
import { profileRows } from "../../lib/view/tax-settings/rows"

interface Props {
	profile: TaxProfile
}

let { profile }: Props = $props()
const rows = $derived(profileRows(profile))
</script>

<dl class="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
	{#each rows as row (row.label)}
		<div class="flex justify-between gap-3 border-b border-border py-1">
			<dt class="text-muted-foreground">{row.label}</dt>
			<dd class="text-right font-medium text-foreground">{row.value}</dd>
		</div>
	{/each}
</dl>
