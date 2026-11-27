<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { tick, untrack } from "svelte"
import { revokeGrant } from "../client/account"
import type { Grant } from "../lib/api-types"
import { formatDate } from "../lib/dates"
import { dictionaryFor, type Language } from "../lib/language"

let { language, initial }: { language: Language; initial: readonly Grant[] } = $props()
const words = $derived(dictionaryFor(language))
let grants = $state<readonly Grant[]>(untrack(() => [...initial]))
let confirming = $state("")
let busyId = $state("")
let message = $state("")
let heading: HTMLHeadingElement | undefined = $state()
let confirmButton: HTMLButtonElement | undefined = $state()

/** The Revoke button of each row, so a cancelled confirm can return focus to the one that opened it. */
const openers = new Map<string, HTMLButtonElement>()

function rememberOpener(node: HTMLButtonElement, id: string): { destroy: () => void } {
	openers.set(id, node)
	return { destroy: () => openers.delete(id) }
}

/** Asks once in the row itself: a native confirm box is not a confirm a person can read. */
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

async function revoke(id: string): Promise<void> {
	busyId = id
	message = ""
	let removed = false
	try {
		await revokeGrant(id)
		grants = grants.filter((grant) => grant.id !== id)
		removed = true
		message = words.accountRevoked
	} catch {
		message = words.accountRevokeError
	} finally {
		confirming = ""
		busyId = ""
		await tick()
		// A removed row has no button to return to, so the section title holds the reader's place.
		if (removed) heading?.focus()
		else openers.get(id)?.focus()
	}
}
</script>

<section class="account-section" aria-labelledby="devices-heading">
	<h2 class="section-title" id="devices-heading" tabindex="-1" bind:this={heading}>
		{words.accountDevices}
	</h2>
	{#if grants.length === 0}
		<p class="muted">{words.accountNoDevices}</p>
	{:else}
		<ul class="grant-list">
			{#each grants as grant (grant.id)}
				<li class="grant">
					<div>
						<p class="grant-name">{grant.clientName}</p>
						<p class="grant-date">
							{words.accountApprovedOn}
							{formatDate(grant.createdAt, words.dateLocale)}
						</p>
					</div>
					{#if confirming === grant.id}
						<div class="confirm-row">
							<span class="confirm-question" id={`revoke-question-${grant.id}`}
								>{words.accountRevokeConfirm}</span
							>
							<button
								class="button button-danger button-small"
								type="button"
								bind:this={confirmButton}
								aria-describedby={`revoke-question-${grant.id}`}
								onclick={() => revoke(grant.id)}
								disabled={busyId === grant.id}
							>
								{words.accountRevoke}
							</button>
							<button
								class="button button-secondary button-small"
								type="button"
								onclick={() => cancel(grant.id)}
								disabled={busyId === grant.id}
							>
								{words.accountConfirmCancel}
							</button>
						</div>
					{:else}
						<button
							class="button button-secondary button-small"
							type="button"
							use:rememberOpener={grant.id}
							onclick={() => ask(grant.id)}
							aria-label={`${words.accountRevoke}: ${grant.clientName}`}
						>
							{words.accountRevoke}
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
	<p class="account-note" role="status" aria-live="polite">{message}</p>
</section>
