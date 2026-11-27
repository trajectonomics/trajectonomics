<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { onMount } from "svelte"

/** The shared failed-load state: one message, one retry, never a skeleton that waits forever. */
let {
	message,
	retryLabel,
	onretry,
}: {
	message: string
	retryLabel: string
	onretry: () => void
} = $props()

let retry: HTMLButtonElement | undefined = $state()

// The alert is the first thing a screen reader meets after the page turns from "loading".
onMount(() => {
	retry?.focus()
})
</script>

<div class="panel">
	<div class="load-failure">
		<p class="form-message" role="alert">{message}</p>
		<button class="button button-secondary" type="button" bind:this={retry} onclick={onretry}>
			{retryLabel}
		</button>
	</div>
</div>
