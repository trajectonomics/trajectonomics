<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { onMount } from "svelte"
import { dictionaryFor, type Language } from "../lib/language"

/** The end of the decision: what happened, focused so a keyboard or screen-reader user hears it. */
let { language, approved }: { language: Language; approved: boolean } = $props()
const words = $derived(dictionaryFor(language))
let status: HTMLDivElement | undefined = $state()

onMount(() => {
	status?.focus()
})
</script>

<div class="panel">
	<div
		class="status {approved ? 'status-done' : 'status-denied'}"
		role="status"
		tabindex="-1"
		bind:this={status}
	>
		<span aria-hidden="true">{approved ? "✓" : "×"}</span>
		{approved ? words.deviceApproved : words.deviceDenied}
	</div>
</div>
