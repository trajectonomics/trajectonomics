<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import { maskMoney } from "../../lib/format"

interface Props {
	/** The amount's digits as the page shows them, such as "12,000" or "−1,234.50". */
	digits: string
	/** What follows the digits, such as " THB" or " THB (kept, not claimed by this Return)". */
	after?: string
}

let { digits, after = "" }: Props = $props()
</script>

<!-- The digits behind the shared mask, keeping the currency and the words after them; shown, the text as it was. -->
{#if preferences.hidden}<span aria-hidden="true">{maskMoney(digits)}</span><span class="sr-only"> amount hidden</span>{after}{:else}{digits}{after}{/if}
