<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import { PRIMARY } from "./styles"

interface Props {
	/** The plan Save wrote, which the page opens once the What-if is settled. */
	name: string
	onOpen: () => void
}

let { name, onOpen }: Props = $props()
let sentence = $state<HTMLParagraphElement>()
/** The What-if holds changes on another plan, so Open's switch waits on it: the sentence says so only then. */
const held = $derived(whatIfSession.active)

// The plan is saved, so this one sentence says it: focus it, as a refusal's alert is focused, so it is announced.
$effect(() => {
	sentence?.focus()
})

// The What-if question took focus from the sentence, and Stay, Revert and Revert-and-switch all close it over this
// page. The control that asked went with the question, so focus comes back to the sentence rather than the body.
let before: { asking: string | null; active: boolean } | null = null
$effect(() => {
	const now = { asking: whatIfSession.asking, active: whatIfSession.active }
	const was = before
	before = now
	// A first run only records: the mount has focused the sentence already.
	if (was === null) return
	if ((was.asking !== null && now.asking === null) || (was.active && !now.active)) sentence?.focus()
})
</script>

<div class="space-y-4">
	<p bind:this={sentence} tabindex="-1" class="text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
		{#if held}
			Saved {name}. Settle the What-if above, then open it.
		{:else}
			Saved {name}. Open it.
		{/if}
	</p>
	<button type="button" class={PRIMARY} onclick={onOpen}>Open {name}</button>
</div>
