<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { dictionaryFor, type Language } from "../lib/language"

/** The typed-code state: one field, one button, and the message that says what went wrong. */
let {
	language,
	code = $bindable(),
	busy,
	message,
	onsubmit,
}: {
	language: Language
	code: string
	busy: boolean
	message: string
	onsubmit: (event: SubmitEvent) => void
} = $props()
const words = $derived(dictionaryFor(language))
</script>

<div class="panel">
	<h1 class="page-title">{words.deviceTitle}</h1>
	<form class="form" onsubmit={onsubmit}>
		<label class="field-label" for="device-code">{words.deviceCodeLabel}</label>
		<input
			id="device-code"
			class="field-input"
			bind:value={code}
			autocomplete="one-time-code"
			autocapitalize="characters"
			spellcheck={false}
			disabled={busy}
		/>
		<button class="button button-primary" type="submit" disabled={busy}>{words.deviceContinue}</button>
	</form>
	{#if message !== ""}
		<p class="form-message" role="alert">{message}</p>
	{/if}
</div>
