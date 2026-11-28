<script lang="ts">
import { PRIMARY } from "./styles"

interface Props {
	/** The plan Save wrote, which the page opens once the What-if is settled. */
	name: string
	onOpen: () => void
}

let { name, onOpen }: Props = $props()
let sentence = $state<HTMLParagraphElement>()

// The plan is saved, so this one sentence says it: focus it, as a refusal's alert is focused, so it is announced.
$effect(() => {
	sentence?.focus()
})
</script>

<div class="space-y-4">
	<p bind:this={sentence} tabindex="-1" class="text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
		Saved {name}. Settle the What-if above, then open it.
	</p>
	<button type="button" class={PRIMARY} onclick={onOpen}>Open {name}</button>
</div>
