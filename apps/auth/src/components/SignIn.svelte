<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { onMount, untrack } from "svelte"
import { readSession, startPasskey, startSocial } from "../client/auth"
import { authorizeHref } from "../client/navigation"
import { dictionaryFor, type Language, pagePath } from "../lib/language"
import { safeNextPath } from "../lib/next"
import { isExpiredSignedOAuthSearch } from "../lib/oauth-search"
import { signInRetryPath } from "../lib/sign-in-retry"

let { language }: { language: Language } = $props()
const words = $derived(dictionaryFor(language))
let next = $state(untrack(() => pagePath(language, "account")))
let message = $state("")
let busy = $state(false)
let deleted = $state(false)
let cancelled = $state(false)
let expired = $state(false)
let query = $state("")

onMount(() => {
	void load()
})

async function load(): Promise<void> {
	const params = new URLSearchParams(window.location.search)
	next = safeNextPath(params.get("next")) ?? pagePath(language, "account")
	deleted = params.has("deleted")
	cancelled = params.has("error")
	query = window.location.search
	// The provider signs the flow for ten minutes. An older one cannot be resumed, so the page says
	// so instead of offering a button that is certain to fail. The server's clock decides, because a
	// device clock that runs fast would otherwise reject a valid flow.
	try {
		expired = isExpiredSignedOAuthSearch(query, (await readSession()).serverNowMs)
	} catch {
		expired = isExpiredSignedOAuthSearch(query, null)
	}
}

async function social(provider: "google" | "github"): Promise<void> {
	message = ""
	busy = true
	try {
		const { pathname, search } = window.location
		await startSocial(provider, next, signInRetryPath(pathname, search))
	} catch {
		message = expired ? words.flowExpired : words.signInError
		busy = false
	}
}

async function passkey(): Promise<void> {
	message = ""
	busy = true
	try {
		// With a signed query the provider's own after-hook resumes the flow and answers with the
		// address to continue to; navigating back to the signed link would re-run `prompt=login`.
		const resumed = await startPasskey()
		window.location.assign(resumed ?? authorizeHref(query, next))
	} catch {
		message = expired ? words.flowExpired : words.signInPasskeyError
		busy = false
	}
}
</script>

<div class="panel">
	<h1 class="page-title">{words.signInTitle}</h1>
	{#if deleted}
		<p class="status status-done" role="status"><span aria-hidden="true">✓</span> {words.signInDeleted}</p>
	{/if}
	{#if cancelled}
		<p class="form-message" role="alert">{words.signInCancelled}</p>
	{/if}
	{#if expired}
		<p class="form-message" role="alert">{words.flowExpired}</p>
	{:else}
		<div class="button-stack">
			<button class="button button-primary" type="button" onclick={() => social("google")} disabled={busy}>
				{words.signInGoogle}
			</button>
			<button class="button button-secondary" type="button" onclick={() => social("github")} disabled={busy}>
				{words.signInGithub}
			</button>
			<button class="button button-secondary" type="button" onclick={passkey} disabled={busy}>
				{words.signInPasskey}
			</button>
		</div>
	{/if}
	{#if message !== ""}
		<p class="form-message" role="alert">{message}</p>
	{/if}
</div>
