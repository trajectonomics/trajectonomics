<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import type { TaxProfile } from "../../lib/contract"
import { TAX_FLAG_KEYS, type TaxFlags } from "../../lib/edit/tax-flags"
import { draftOf, keepsStoredShared, wholeDraftOf } from "../../lib/view/tax-settings/draft"
import { sharedDropWarning } from "../../lib/view/tax-settings/flags"
import { GROUPS, type GroupKey } from "../../lib/view/tax-settings/groups"
import { taxEdit } from "../../lib/view/tax-settings/profile-edit"
import { needsWholeProfile, taxShown } from "../../lib/view/tax-settings/refusal"
import ItemActions from "../plan-items/ItemActions.svelte"
import TaxFlowLabels from "./TaxFlowLabels.svelte"
import TaxProfileFields from "./TaxProfileFields.svelte"

interface Props {
	name: string
	/** The content hash of the plan the page read, which the Edit names (cli ADR 0055). */
	contentHash: string
	/** The stored profile; null when none is stored, and then the profile is set whole. */
	profile: TaxProfile | null
	/** The group whose items a change shows; null shows every item. Stating the whole profile shows every item. */
	group?: GroupKey | null
	/** The income Flows with no tax label: a whole write labels each, because `traj` refuses a plan with an unlabelled one. */
	unlabelled?: readonly string[]
	/** The plan's household names a partner and Owners, so a separate draft may state the shared home-loan interest. */
	sharedClaimable?: boolean
	/** True after a holder swap: every flat claim's field waits for `--from-stored`. */
	flatClaimsLocked?: boolean
	onDone: () => void
}

let {
	name,
	contentHash,
	profile,
	group = null,
	unlabelled = [],
	sharedClaimable = true,
	flatClaimsLocked = false,
	onDone,
}: Props = $props()
const unstored = () => profile === null
const initial = () => draftOf(profile)
let whole = $state(unstored())
let draft = $state(initial())
let problems: Readonly<Record<string, string>> = $state({})
let labels: Record<string, string> = $state({})
let sent: TaxFlags | null = $state(null)
const merging = $derived(profile !== null && !whole)
const visible = $derived(
	(merging && group !== null && GROUPS.find((one) => one.key === group)?.items) || TAX_FLAG_KEYS,
)
const shown = $derived(taxShown(problems, editSession.failure, editSession.error, visible, sent))
// The sentence is about the field the form offers: only a separate draft can keep the stored shared interest.
const keepsShared = $derived(keepsStoredShared(profile, draft, sharedClaimable))
const dropWarning = $derived(sharedDropWarning(profile, whole, draft))
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

/** Switches between changing one item and stating the whole profile, which fills in only the stored shared interest. */
function switchTo(next: boolean): void {
	editSession.clear()
	problems = {}
	whole = next
	draft = next ? wholeDraftOf(profile, sharedClaimable) : initial()
}

async function save(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	const result = taxEdit(
		{ name, contentHash, origin: profile === null ? null : initial(), unlabelled },
		draft,
		whole,
		labels,
	)
	editSession.clear()
	problems = result.ok ? {} : result.problems
	sent = result.ok && "flags" in result.edit ? result.edit.flags : null
	if (result.ok && (await editSession.run(result.edit))) onDone()
}
</script>

<form onsubmit={save} class="space-y-6" aria-label="Tax profile">
	{#if merging}
		<p class="text-sm text-muted-foreground">Change an item and save: every other item of the stored profile stays. Empty an amount to take it out.</p>
	{:else}
		<p class="text-sm text-muted-foreground">
			State the whole profile. An item left empty is none, and anything an earlier write stated and you leave out is dropped. {#if keepsShared && dropWarning === null}The stored shared home-loan interest is filled in so a save keeps it.{/if}
		</p>
	{/if}
	<TaxProfileFields bind:draft {shown} {visible} {sharedClaimable} lockedFlat={flatClaimsLocked} />
	{#if !merging}<TaxFlowLabels flows={unlabelled} bind:labels {shown} />{/if}
	{#if dropWarning}<p role="status" class="text-sm text-destructive">{dropWarning}</p>{/if}
	{#if shown.general}<p role="alert" class="text-sm text-destructive">{shown.general}</p>{/if}
	{#if needsWholeProfile(editSession.failure)}
		<button type="button" class={button} disabled={flatClaimsLocked} onclick={() => switchTo(true)}>Set the whole profile</button>
	{/if}
	{#if profile !== null}
		<button type="button" class={button} disabled={flatClaimsLocked && merging} onclick={() => switchTo(merging)}>
			{merging ? "State the whole profile instead" : "Change one item instead"}
		</button>
	{/if}
	<ItemActions kind="account" />
</form>
