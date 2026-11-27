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

/** Asks once in the row itself: a native confirm box is not a confirm a person can read. */
async function ask(id: string): Promise<void> {
	confirming = id
	message = ""
	await tick()
	confirmButton?.focus()
}

async function revoke(id: string): Promise<void> {
	busyId = id
	message = ""
	try {
		await revokeGrant(id)
		grants = grants.filter((grant) => grant.id !== id)
		message = words.accountRevoked
	} catch {
		message = words.accountRevokeError
	} finally {
		confirming = ""
		busyId = ""
		// The row that held the button is gone; the section title is where the reader lands.
		heading?.focus()
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
							<span class="confirm-question">{words.accountRevokeConfirm}</span>
							<button
								class="button button-danger button-small"
								type="button"
								bind:this={confirmButton}
								onclick={() => revoke(grant.id)}
								disabled={busyId === grant.id}
							>
								{words.accountRevoke}
							</button>
							<button
								class="button button-secondary button-small"
								type="button"
								onclick={() => (confirming = "")}
							>
								{words.accountConfirmCancel}
							</button>
						</div>
					{:else}
						<button
							class="button button-secondary button-small"
							type="button"
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
