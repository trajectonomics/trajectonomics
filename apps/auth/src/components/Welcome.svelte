<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { onMount, untrack } from "svelte"
import { getConsent, saveConsent } from "../client/auth"
import { ensureSignedIn } from "../client/guard"
import { continueOAuth } from "../client/oauth"
import { currentConsentWording } from "../lib/consent-wording"
import { dictionaryFor, type Language, pagePath } from "../lib/language"
import { safeNextPath } from "../lib/next"
import { isExpiredSignedOAuthSearch, isSignedOAuthSearch } from "../lib/oauth-search"
import LoadFailure from "./LoadFailure.svelte"

let { language }: { language: Language } = $props()
const words = $derived(dictionaryFor(language))
const wording = $derived(currentConsentWording(language))
let view = $state<"loading" | "question" | "expired" | "failed">("loading")
let checked = $state(false)
let busy = $state(false)
let message = $state("")
let next = $state(untrack(() => pagePath(language, "account")))
let oauth = $state(false)

onMount(() => {
	void load()
})

async function load(): Promise<void> {
	view = "loading"
	try {
		const signedIn = await ensureSignedIn(language)
		if (signedIn === null) return
		const search = window.location.search
		next = safeNextPath(new URLSearchParams(search).get("next")) ?? pagePath(language, "account")
		oauth = isSignedOAuthSearch(search)
		// The provider signs the flow for ten minutes; an older one cannot be continued and no
		// button would help, so the page stops at the explanation. The server's clock decides.
		if (oauth && isExpiredSignedOAuthSearch(search, signedIn.serverNowMs)) {
			view = "expired"
			return
		}
		if ((await getConsent()) !== null) {
			await resume()
			return
		}
		view = "question"
	} catch {
		view = "failed"
	}
}

async function resume(): Promise<void> {
	if (oauth) {
		const result = await continueOAuth()
		window.location.assign(result.url)
		return
	}
	window.location.assign(next)
}

async function submit(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	busy = true
	message = ""
	try {
		await saveConsent(checked, "first-sign-in", language)
		await resume()
	} catch {
		message = words.welcomeError
		busy = false
	}
}
</script>

{#if view === "failed"}
	<LoadFailure message={words.welcomeError} retryLabel={words.loadRetry} onretry={load} />
{:else if view === "expired"}
	<div class="panel">
		<h1 class="page-title">{words.welcomeTitle}</h1>
		<p class="form-message" role="alert">{words.flowExpired}</p>
	</div>
{:else}
	<div class="panel">
		<h1 class="page-title">{words.welcomeTitle}</h1>
		{#if view === "loading"}
			<p class="muted" aria-live="polite">{words.loading}</p>
		{:else}
			<form class="form" onsubmit={submit}>
				<label class="check">
					<input type="checkbox" bind:checked disabled={busy} />
					<span>{wording}</span>
				</label>
				<button class="button button-primary" type="submit" disabled={busy}>{words.welcomeContinue}</button>
			</form>
			{#if message !== ""}
				<p class="form-message" role="alert">{message}</p>
			{/if}
			<p class="legal-links"><a href={pagePath(language, "privacy")}>{words.welcomePrivacy}</a></p>
		{/if}
	</div>
{/if}
