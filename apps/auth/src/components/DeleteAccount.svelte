<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { tick } from "svelte"
import { deleteAccount } from "../client/auth"
import { AuthRequestError } from "../client/errors"
import { dictionaryFor, type Language, pagePath } from "../lib/language"

let { language, email }: { language: Language; email: string } = $props()
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
		message =
			error instanceof AuthRequestError && error.code === "SESSION_EXPIRED"
				? words.accountDeleteExpired
				: words.accountDeleteError
		busy = false
		await tick()
		alert?.focus()
	}
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
