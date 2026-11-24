<script lang="ts">
import type { Future } from "../../lib/view/chance/futures"

interface Props {
	future: Future
}

/** How a future ended, in words: the month the money ran out, or that it lasted to the Horizon. */
let { future }: Props = $props()
</script>

{#if future.ranOut !== null}
	<span class="text-destructive">Ran out in {future.ranOut}</span>
{:else}
	<span>Lasted</span>
{/if}
