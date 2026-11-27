<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { onMount } from "svelte"
import { ensureSignedIn } from "../client/guard"
import { getPublicClient, sendConsent } from "../client/oauth"
import { dictionaryFor, type Language } from "../lib/language"
import { isExpiredSignedOAuthSearch } from "../lib/oauth-search"
import { type ScopeLine, scopeLines, scopeText } from "../lib/scopes"
import LoadFailure from "./LoadFailure.svelte"
import Loading from "./Loading.svelte"

let { language }: { language: Language } = $props()
const words = $derived(dictionaryFor(language))
let view = $state<"loading" | "review" | "invalid" | "expired" | "failed">("loading")
let clientName = $state("")
let lines = $state<readonly ScopeLine[]>([])
let busy = $state(false)
let message = $state("")

onMount(() => {
	void load()
})

async function load(): Promise<void> {
	view = "loading"
	try {
		const signedIn = await ensureSignedIn(language)
		if (signedIn === null) return
		const search = window.location.search
		// The provider signs the flow for ten minutes. An expired one cannot be approved, so the page
		// says so rather than posting an answer the provider will refuse. The clock is the server's,
		// from the same session answer, so a device clock that runs fast cannot block a valid flow.
		if (isExpiredSignedOAuthSearch(search, signedIn.serverNowMs)) {
			view = "expired"
			return
		}
		const params = new URLSearchParams(search)
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
	} catch {
		view = "failed"
	}
}

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

{#if view === "failed"}
	<LoadFailure message={words.consentError} retryLabel={words.loadRetry} onretry={load} />
{:else if view === "loading"}
	<Loading title={words.consentTitle} text={words.loading} />
{:else if view === "expired"}
	<div class="panel">
		<h1 class="page-title">{words.consentTitle}</h1>
		<p class="form-message" role="alert">{words.flowExpired}</p>
	</div>
{:else}
	<div class="panel">
		{#if view === "invalid"}
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
{/if}
