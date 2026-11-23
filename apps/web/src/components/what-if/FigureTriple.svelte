<script lang="ts">
import type { Triple } from "../../lib/view/what-if/triple"
import CellView from "../compare/CellView.svelte"
import ChangeText from "./ChangeText.svelte"

interface Props {
	triple: Triple
	/** Draws the what-if value as the main figure (a stat) rather than at body size (a table cell). */
	large?: boolean
}

/**
 * One figure while a what-if is open: the what-if value as the main figure, the baseline under it in muted
 * text with its name, and the change the CLI stated with its sign and words.
 */
let { triple, large = false }: Props = $props()
</script>

<span class="block space-y-0.5">
	<span class={large ? "block text-2xl font-semibold tracking-tight tabular-nums" : "block font-semibold tabular-nums"}>
		<span class="sr-only">What-if: </span><CellView cell={triple.whatIf} />
	</span>
	<span class="block text-sm text-muted-foreground"><span>Baseline: </span><CellView cell={triple.baseline} /></span>
	<span class="block text-sm"><span class="sr-only">Change: </span><ChangeText change={triple.change} /></span>
</span>
