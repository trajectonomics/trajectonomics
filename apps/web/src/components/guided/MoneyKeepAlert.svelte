<script lang="ts">
import { keepProblem, type RowDrafts } from "../../lib/view/guided/money-draft"
import { PROBLEM } from "./styles"

interface Props {
	/** Every row's answer, so the sentence shows when none of them is kept. */
	rows: RowDrafts
	/** Whether Next found a problem: the sentence shows only then. */
	showProblems: boolean
}

let { rows, showProblems }: Props = $props()
const text = $derived(showProblems ? keepProblem(rows) : null)
let sentence = $state<HTMLParagraphElement>()
let shown = false

// Next is what puts the problems on the step, so it moves focus to the sentence that says why no step moved. Once
// they are shown, unticking the last kept row changes these words but is not Next: the checkbox keeps the focus.
$effect(() => {
	if (!showProblems) {
		shown = false
		return
	}
	if (shown) return
	shown = true
	sentence?.focus()
})
</script>

{#if text}
	<p bind:this={sentence} role="alert" tabindex="-1" class={PROBLEM}>{text}</p>
{/if}
