<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { onMount, untrack } from "svelte"
import { startPasskey, startSocial } from "../client/auth"
import { authorizeHref } from "../client/navigation"
import { dictionaryFor, type Language, pagePath } from "../lib/language"
import { safeNextPath } from "../lib/next"

let { language }: { language: Language } = $props()
const words = $derived(dictionaryFor(language))
let next = $state(untrack(() => pagePath(language, "account")))
let message = $state("")
let busy = $state(false)
let deleted = $state(false)

onMount(() => {
	const params = new URLSearchParams(window.location.search)
	next = safeNextPath(params.get("next")) ?? pagePath(language, "account")
	deleted = params.has("deleted")
})

async function social(provider: "google" | "github"): Promise<void> {
	message = ""
	busy = true
	try {
		await startSocial(provider, next)
	} catch {
		message = words.signInError
		busy = false
	}
}

async function passkey(): Promise<void> {
	message = ""
	busy = true
	try {
		await startPasskey()
		window.location.assign(authorizeHref(window.location.search, next))
	} catch {
		message = words.signInPasskeyError
		busy = false
	}
}
</script>

<div class="panel">
	<h1 class="page-title">{words.signInTitle}</h1>
	{#if deleted}
		<p class="status status-done" role="status"><span aria-hidden="true">✓</span> {words.signInDeleted}</p>
	{/if}
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
	{#if message !== ""}
		<p class="form-message" role="alert">{message}</p>
	{/if}
	<p class="legal-links">
		<a href={pagePath(language, "privacy")}>{words.signInPrivacy}</a>
		<span aria-hidden="true">·</span>
		<a href={pagePath(language, "terms")}>{words.signInTerms}</a>
	</p>
</div>
