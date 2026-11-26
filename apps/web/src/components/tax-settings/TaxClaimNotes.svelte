<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"

interface Props {
	/** The CLI's own sentences about the stored claims, shown as written, one paragraph each. */
	lines: readonly string[]
}

let { lines }: Props = $props()
</script>

<!-- The CLI's notes on the claims the profile stores. A note can state an amount, so Hide amounts hides them all. -->
{#if lines.length > 0}
	<section aria-labelledby="tax-claim-notes" class="space-y-2">
		<h3 id="tax-claim-notes" class="text-sm font-semibold">Notes on the stored claims</h3>
		{#if preferences.hidden}
			<p class="text-sm text-muted-foreground">The notes on the stored claims are hidden with the amounts.</p>
		{:else}
			<!-- Keyed by position: two notes may read the same. -->
			{#each lines as line, index (index)}
				<p class="text-sm text-foreground wrap-anywhere">{line}</p>
			{/each}
		{/if}
	</section>
{/if}
