<script lang="ts">
interface Props {
	/** The CLI's own sentences about the stored claims, shown as written, one paragraph each. */
	lines: readonly string[]
}

let { lines }: Props = $props()
</script>

<!-- The CLI's notes on the claims the profile stores: plain paragraphs, never figures, so hide-amounts leaves them whole. -->
{#if lines.length > 0}
	<section aria-labelledby="tax-claim-notes" class="space-y-2">
		<h3 id="tax-claim-notes" class="text-sm font-semibold">Notes on the stored claims</h3>
		{#each lines as line}
			<p class="text-sm text-foreground">{line}</p>
		{/each}
	</section>
{/if}
