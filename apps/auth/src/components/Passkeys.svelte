<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { tick, untrack } from "svelte"
import { listPasskeys, removePasskey } from "../client/account"
import { addPasskey } from "../client/auth"
import type { Passkey } from "../lib/api-types"
import { formatDate } from "../lib/dates"
import { dictionaryFor, type Language } from "../lib/language"

let { language, initial }: { language: Language; initial: readonly Passkey[] } = $props()
const words = $derived(dictionaryFor(language))
let passkeys = $state<readonly Passkey[]>(untrack(() => [...initial]))
let confirming = $state("")
let busy = $state(false)
let message = $state("")
let heading: HTMLHeadingElement | undefined = $state()
let confirmButton: HTMLButtonElement | undefined = $state()

/** The Remove button of each row, so a cancelled confirm can return focus to the one that opened it. */
const openers = new Map<string, HTMLButtonElement>()

function rememberOpener(node: HTMLButtonElement, id: string): { destroy: () => void } {
	openers.set(id, node)
	return { destroy: () => openers.delete(id) }
}

async function add(): Promise<void> {
	busy = true
	message = ""
	try {
		const today = formatDate(new Date().toISOString(), words.dateLocale)
		await addPasskey(`${words.accountPasskeyName} · ${today}`)
		passkeys = await listPasskeys()
		message = words.accountPasskeyAdded
	} catch {
		message = words.accountPasskeyError
	} finally {
		busy = false
	}
}

/** Asks once in the row itself, then leaves focus on the answer. */
async function ask(id: string): Promise<void> {
	confirming = id
	message = ""
	await tick()
	confirmButton?.focus()
}

/** Cancels the question and puts the reader back on the button that asked it. */
async function cancel(id: string): Promise<void> {
	confirming = ""
	await tick()
	openers.get(id)?.focus()
}

async function remove(id: string): Promise<void> {
	busy = true
	message = ""
	let removed = false
	try {
		await removePasskey(id)
		passkeys = passkeys.filter((passkey) => passkey.id !== id)
		removed = true
		message = words.accountPasskeyRemoved
	} catch {
		message = words.accountPasskeyRemoveError
	} finally {
		confirming = ""
		busy = false
		await tick()
		if (removed) heading?.focus()
		else openers.get(id)?.focus()
	}
}
</script>

<section class="account-section" aria-labelledby="passkeys-heading">
	<div class="section-head">
		<h2 class="section-title" id="passkeys-heading" tabindex="-1" bind:this={heading}>
			{words.accountPasskeys}
		</h2>
		<button class="button button-secondary button-small" type="button" onclick={add} disabled={busy}>
			{words.accountAddPasskey}
		</button>
	</div>
	{#if passkeys.length === 0}
		<p class="muted">{words.accountNoPasskeys}</p>
	{:else}
		<ul class="passkey-list">
			{#each passkeys as passkey (passkey.id)}
				{@const name = passkey.name ?? words.accountPasskeyName}
				<li class="passkey">
					<div>
						<p class="passkey-name">{name}</p>
						<p class="passkey-date">{formatDate(passkey.createdAt, words.dateLocale)}</p>
					</div>
					{#if confirming === passkey.id}
						<div class="confirm-row">
							<span class="confirm-question" id={`remove-question-${passkey.id}`}
								>{words.accountRemoveConfirm}</span
							>
							<button
								class="button button-danger button-small"
								type="button"
								bind:this={confirmButton}
								aria-describedby={`remove-question-${passkey.id}`}
								onclick={() => remove(passkey.id)}
								disabled={busy}
							>
								{words.accountRemove}
							</button>
							<button
								class="button button-secondary button-small"
								type="button"
								onclick={() => cancel(passkey.id)}
								disabled={busy}
							>
								{words.accountConfirmCancel}
							</button>
						</div>
					{:else}
						<button
							class="button button-secondary button-small"
							type="button"
							use:rememberOpener={passkey.id}
							onclick={() => ask(passkey.id)}
							disabled={busy}
							aria-label={`${words.accountRemove}: ${name}`}
						>
							{words.accountRemove}
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
	<p class="account-note" role="status" aria-live="polite">{message}</p>
</section>
