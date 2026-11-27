<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { onMount } from "svelte"
import { ensureSignedIn } from "../client/guard"
import { getPublicClient, sendConsent } from "../client/oauth"
import { dictionaryFor, type Language } from "../lib/language"
import { type ScopeLine, scopeLines, scopeText } from "../lib/scopes"

let { language }: { language: Language } = $props()
const words = $derived(dictionaryFor(language))
type View = "loading" | "review" | "invalid"
let view = $state<View>("loading")
let clientName = $state("")
let lines = $state<readonly ScopeLine[]>([])
let busy = $state(false)
let message = $state("")

onMount(async () => {
	const session = await ensureSignedIn(language)
	if (session === null) return
	const params = new URLSearchParams(window.location.search)
	const clientId = params.get("client_id")
	if (clientId === null || clientId === "") {
		view = "invalid"
		return
	}
	lines = scopeLines(params.get("scope"))
	try {
		clientName = (await getPublicClient(clientId)).client_name ?? ""
	} catch {
		clientName = ""
	}
	view = "review"
})

async function decide(accept: boolean): Promise<void> {
	busy = true
	message = ""
	try {
		const result = await sendConsent(accept)
		window.location.assign(result.url)
	} catch {
		message = words.consentError
		busy = false
	}
}
</script>

<div class="panel">
	{#if view === "loading"}
		<p class="muted" aria-live="polite">{words.deviceLoading}</p>
	{:else if view === "invalid"}
		<p class="form-message" role="alert">{words.consentInvalid}</p>
	{:else}
		<h1 class="page-title">{words.consentHeading(clientName === "" ? words.consentUnknownApp : clientName)}</h1>
		<p class="device-wants">{words.consentWants}</p>
		<ul class="scope-list">
			{#each lines as line (line.scope)}
				<li>{scopeText(line, words)}</li>
			{/each}
		</ul>
		<div class="button-row">
			<button class="button button-primary" type="button" onclick={() => decide(true)} disabled={busy}>
				{words.consentAllow}
			</button>
			<button class="button button-secondary" type="button" onclick={() => decide(false)} disabled={busy}>
				{words.consentDeny}
			</button>
		</div>
	{/if}
	{#if message !== ""}
		<p class="form-message" role="alert">{message}</p>
	{/if}
</div>
