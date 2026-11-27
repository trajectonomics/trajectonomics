<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { onMount, untrack } from "svelte"
import { getConsent, saveConsent } from "../client/auth"
import { ensureSignedIn } from "../client/guard"
import { continueOAuth } from "../client/oauth"
import { dictionaryFor, type Language, pagePath } from "../lib/language"
import { safeNextPath } from "../lib/next"
import { isSignedOAuthSearch } from "../lib/oauth-search"

let { language }: { language: Language } = $props()
const words = $derived(dictionaryFor(language))
let checked = $state(false)
let busy = $state(false)
let message = $state("")
let next = $state(untrack(() => pagePath(language, "account")))
let oauth = $state(false)

onMount(async () => {
	const session = await ensureSignedIn(language)
	if (session === null) return
	const params = new URLSearchParams(window.location.search)
	next = safeNextPath(params.get("next")) ?? pagePath(language, "account")
	oauth = isSignedOAuthSearch(window.location.search)
	try {
		if ((await getConsent()) !== null) await resume()
	} catch {
		message = words.welcomeError
	}
})

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
		await saveConsent(checked, "first-sign-in")
		await resume()
	} catch {
		message = words.welcomeError
		busy = false
	}
}
</script>

<div class="panel">
	<h1 class="page-title">{words.welcomeTitle}</h1>
	<form class="form" onsubmit={submit}>
		<label class="check">
			<input type="checkbox" bind:checked disabled={busy} />
			<span>{words.welcomeCheckbox}</span>
		</label>
		<button class="button button-primary" type="submit" disabled={busy}>{words.welcomeContinue}</button>
	</form>
	{#if message !== ""}
		<p class="form-message" role="alert">{message}</p>
	{/if}
	<p class="legal-links"><a href={pagePath(language, "privacy")}>{words.welcomePrivacy}</a></p>
</div>
