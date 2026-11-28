<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { currentItemText } from "../../client/item-names.svelte.js"
import { actionSource } from "../../lib/view/action-source"
import { keepEdit } from "../../lib/view/assumed/keep"
import type { AssumedKeep, AssumedKeeper, AssumedLine } from "../../lib/view/assumed/types"
import { BUTTON } from "../plans/styles"
import ActionRefusal from "../ui/ActionRefusal.svelte"

interface Props {
	keeper: AssumedKeeper
	line: AssumedLine
	keep: AssumedKeep
}

let { keeper, line, keep }: Props = $props()
const source = $derived(actionSource("keep", keeper.plan, line.key))
// A line with no words is an amount, which the label never repeats: amounts may be hidden.
const label = $derived(
	[
		"Keep",
		line.subject && currentItemText(line.subject.kind, line.subject.id),
		line.text ?? "amount",
	]
		.filter(Boolean)
		.join(" "),
)

function press(): void {
	editSession.run(keepEdit(keeper.plan, keeper.contentHash, keep), source)
}
</script>

<!-- States the value as it is, so the plan no longer assumes it. Its refusal shows here, on a line of its own. -->
<button type="button" aria-label={label} onclick={press} disabled={editSession.busy} class={BUTTON}>
	Keep
</button>
<ActionRefusal {source} />
