<script lang="ts">
import { labelCommand } from "../../lib/view/tax-settings/labels"

interface Props {
	name: string
	/** The income Flows of the plan that carry no tax label. */
	flows: readonly string[]
	/** Whether a profile is stored: a merge keeps it, and without one the whole profile is stated again. */
	stored: boolean
}

let { name, flows, stored }: Props = $props()
</script>

<div class="space-y-2 rounded-md border border-border bg-muted p-3 text-sm text-foreground">
	<p>
		The tax rules read an income Flow only when it has a tax label, and {flows.length === 1 ? "this Flow has" : "these Flows have"} none: <strong>{flows.join(", ")}</strong>. This page does not set labels, so the tax profile is changed after they are set.
	</p>
	<p>Give each one a label in a terminal, then reload this page:</p>
	<code class="block overflow-x-auto rounded border border-border bg-card px-2 py-1">{labelCommand(name, stored)}</code>
</div>
