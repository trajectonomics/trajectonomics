<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import { unplacedRefusals } from "../../lib/what-if/answer"

const refusals = $derived(
	whatIfSession.whatIf === null ? [] : unplacedRefusals(whatIfSession.answer, whatIfSession.whatIf),
)
</script>

<!-- What the session says about itself: that it is reading, why it could not, and a refusal that names no change. -->
{#if whatIfSession.reading}
	<p role="status" class="text-sm text-muted-foreground">Reading the what-if…</p>
{/if}
{#if whatIfSession.error !== null}
	<p role="alert" class="text-sm text-destructive">{whatIfSession.error}</p>
{/if}
{#each refusals as message (message)}
	<p role="alert" class="text-sm text-destructive">{message}</p>
{/each}
