<script lang="ts">
import { currentItemNames } from "../../client/item-names.svelte.js"
import { type ItemKind, itemLabel } from "../../lib/view/item-names"

interface Props {
	kind: ItemKind
	/** The item's id in the plan, which a Read may name. */
	id: string
}

let { kind, id }: Props = $props()
const label = $derived(itemLabel(currentItemNames(), kind, id))
</script>

<!-- A plan item by the words a Read states for it. An id no Read names (a Flow, a Milestone) shows as the id, in code. -->
{#if label.named}<span data-item={id} data-kind={kind}>{label.text}</span>{:else}<code class="font-mono text-[0.9em]" data-item={id} data-kind={kind} data-unnamed>{id}</code>{/if}
