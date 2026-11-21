<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import { maskMoney } from "../../lib/format"
import type { OverrideView } from "../../lib/view/projection/statement"

interface Props {
	overrides: readonly OverrideView[]
	/** Overrides the hide-amounts switch. Left out, the switch decides. */
	hidden?: boolean | undefined
}

/** The Overrides applied, each with its path and its value, or a line saying there were none. */
let { overrides, hidden }: Props = $props()
const isHidden = $derived(hidden ?? preferences.hidden)
</script>

{#if overrides.length === 0}
	<p class="text-sm">No Overrides</p>
{:else}
	<div class="space-y-2 text-sm">
		<p class="font-medium">Overrides applied</p>
		<ul class="space-y-1">
			{#each overrides as override (override.path)}
				<li class="flex flex-wrap gap-x-3 break-all">
					<code class="font-mono">{override.path}</code>
					<span class="font-mono tabular-nums">
						{isHidden && override.sensitive ? maskMoney(override.display) : override.display}
					</span>
				</li>
			{/each}
		</ul>
	</div>
{/if}
