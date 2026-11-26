<script lang="ts">
import type { ItemLabel } from "../../lib/view/item-names"

interface Props {
	label: ItemLabel
}

/** An item's words a card or a sentence shows: the plan's label, or the id in code when the plan names none. */
let { label }: Props = $props()
</script>

{#if label.named}<span>{label.text}</span>{:else}<code class="font-mono text-[0.9em]">{label.text}</code>{/if}
