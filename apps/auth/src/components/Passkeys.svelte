<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { untrack } from "svelte"
import { listPasskeys, removePasskey } from "../client/account"
import { addPasskey } from "../client/auth"
import type { Passkey } from "../lib/api-types"
import { formatDate } from "../lib/dates"
import { dictionaryFor, type Language } from "../lib/language"

let { language, initial }: { language: Language; initial: readonly Passkey[] } = $props()
const words = $derived(dictionaryFor(language))
let passkeys = $state<readonly Passkey[]>(untrack(() => [...initial]))
let busy = $state(false)
let message = $state("")

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

async function remove(id: string): Promise<void> {
	busy = true
	message = ""
	try {
		await removePasskey(id)
		passkeys = passkeys.filter((passkey) => passkey.id !== id)
		message = words.accountPasskeyRemoved
	} catch {
		message = words.accountPasskeyRemoveError
	} finally {
		busy = false
	}
}
</script>

<section class="account-section" aria-labelledby="passkeys-heading">
	<div class="section-head">
		<h2 class="section-title" id="passkeys-heading">{words.accountPasskeys}</h2>
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
					<button
						class="button button-secondary button-small"
						type="button"
						onclick={() => remove(passkey.id)}
						disabled={busy}
						aria-label={`${words.accountRemove}: ${name}`}
					>
						{words.accountRemove}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	<p class="account-note" role="status" aria-live="polite">{message}</p>
</section>
