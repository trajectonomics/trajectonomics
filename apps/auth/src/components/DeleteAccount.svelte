<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { tick } from "svelte"
import { deleteAccount, readSession, signOut } from "../client/auth"
import { AuthRequestError } from "../client/errors"
import { deletionFailureOutcome } from "../lib/deletion-outcome"
import { dictionaryFor, type Language, pagePath } from "../lib/language"

let {
	language,
	email,
	onfailed,
}: {
	language: Language
	email: string
	/** The failures after which the account page offers no more controls. */
	onfailed: (outcome: "signed-out" | "unconfirmed") => void
} = $props()
const words = $derived(dictionaryFor(language))
let typed = $state("")
let busy = $state(false)
let message = $state("")
let alert: HTMLParagraphElement | undefined = $state()
const matches = $derived(
	typed.trim() !== "" && typed.trim().toLowerCase() === email.trim().toLowerCase(),
)

async function remove(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	if (!matches) return
	busy = true
	message = ""
	try {
		await deleteAccount()
		window.location.assign(`${pagePath(language, "sign-in")}?deleted=1`)
	} catch (error) {
		// Only a 4xx answer says the account is still there. Without one (a network error, a lost
		// response or a 5xx) the page claims neither a deletion nor a sign-out.
		if (!(error instanceof AuthRequestError) || deletionFailureOutcome(error) === "unconfirmed") {
			onfailed("unconfirmed")
			return
		}
		// A stale sign-in is recoverable on this page.
		if (error.code === "SESSION_EXPIRED") {
			await stay(words.accountDeleteExpired)
			return
		}
		if (await endSession()) onfailed("signed-out")
		else await stay(words.accountDeleteRetry)
	}
}

/**
 * Signs out after a refused deletion, then asks the server whether the session is really gone. A
 * session that remains, or one that cannot be read, is never reported as signed out.
 */
async function endSession(): Promise<boolean> {
	try {
		await signOut()
	} catch {
		// The read below decides what happened.
	}
	try {
		return (await readSession()).session === null
	} catch {
		return false
	}
}

/** Keeps the account page, with the reason beside the button. */
async function stay(reason: string): Promise<void> {
	message = reason
	busy = false
	await tick()
	alert?.focus()
}
</script>

<section class="danger-zone" aria-labelledby="delete-heading">
	<h2 class="section-title" id="delete-heading">{words.accountDeleteHeading}</h2>
	<p>{words.accountDeleteWarning}</p>
	<form class="form" onsubmit={remove}>
		<label class="field-label" for="delete-email">{words.accountDeleteEmailLabel}</label>
		<input
			id="delete-email"
			class="field-input"
			type="email"
			bind:value={typed}
			autocomplete="off"
			disabled={busy}
		/>
		<button class="button button-danger" type="submit" disabled={!matches || busy}>
			{words.accountDeleteButton}
		</button>
	</form>
	{#if message !== ""}
		<p class="form-message" role="alert" tabindex="-1" bind:this={alert}>{message}</p>
	{/if}
</section>
