<script lang="ts">
import type { AssumedSubject } from "../../lib/view/assumed/types"
import ItemName from "../ui/ItemName.svelte"

interface Props {
	/** The plan item the words are about, or none. */
	subject?: AssumedSubject | null | undefined
	text?: string | undefined
}

let { subject = null, text = "" }: Props = $props()
</script>

<!-- A sentence or a line: the item's name, as a Read states it (web ADR 0029), then the words about it. -->
{#if subject}<ItemName kind={subject.kind} id={subject.id} />{" "}{/if}{text}
