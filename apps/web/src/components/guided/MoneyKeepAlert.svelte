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
let last: string | null = null

// Next moved no step because no row is kept: focus the sentence that says so, as a refusal's alert is focused.
$effect(() => {
	if (text === null) {
		last = null
		return
	}
	if (text === last) return
	last = text
	sentence?.focus()
})
</script>

{#if text}
	<p bind:this={sentence} role="alert" tabindex="-1" class={PROBLEM}>{text}</p>
{/if}
