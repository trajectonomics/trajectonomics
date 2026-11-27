<script lang="ts">
import { taxLabelNotice } from "../../client/tax-label-notice.svelte.js"
</script>

<!-- A new income in a taxed plan has no label yet, and the tax rules read only labelled income. -->
{#if taxLabelNotice.href !== null}
	<p class="text-sm text-muted-foreground">Give this income a label in <a href={taxLabelNotice.href} onclick={() => taxLabelNotice.clear()} class="underline underline-offset-4">Tax labels</a>.</p>
{/if}
