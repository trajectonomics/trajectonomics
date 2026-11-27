<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { dictionaryFor, type Language } from "../lib/language"
import { type ScopeLine, scopeText } from "../lib/scopes"

/**
 * What the person decides on: the code in large type, the account it will connect, the one sentence
 * RFC 8628 asks for, and the permissions the app requested.
 */
let {
	language,
	code,
	email,
	clientName,
	lines,
	busy,
	message,
	onapprove,
	ondeny,
}: {
	language: Language
	code: string
	email: string
	clientName: string
	lines: readonly ScopeLine[]
	busy: boolean
	message: string
	onapprove: () => void
	ondeny: () => void
} = $props()
const words = $derived(dictionaryFor(language))
</script>

<div class="panel">
<section class="device-review" aria-labelledby="device-app">
	<p class="device-code-label">{words.deviceCodeLabel}</p>
	<p class="device-code">{code}</p>
	<p class="device-signed-in">
		{words.deviceSignedInAs}
		<span class="device-email">{email}</span>
	</p>
	<p class="device-warning">{words.deviceConfirmWarning}</p>
	<h1 class="device-app" id="device-app">
		{clientName === "" ? words.deviceUnknownApp : clientName}
	</h1>
	<p class="device-wants">{words.deviceWants}</p>
	<ul class="scope-list">
		{#each lines as line (line.scope)}
			<li>{scopeText(line, words)}</li>
		{/each}
	</ul>
	<div class="button-row">
		<button class="button button-primary" type="button" onclick={onapprove} disabled={busy}>
			{words.deviceApprove}
		</button>
		<button class="button button-secondary" type="button" onclick={ondeny} disabled={busy}>
			{words.deviceDeny}
		</button>
	</div>
	{#if message !== ""}
		<p class="form-message" role="alert">{message}</p>
	{/if}
</section>
</div>
