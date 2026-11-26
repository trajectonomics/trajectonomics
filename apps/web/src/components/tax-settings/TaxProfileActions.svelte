<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { ScenarioShow, TaxYear } from "../../lib/contract"
import { personNames } from "../../lib/view/item-names"
import { returnsOf } from "../../lib/view/tax"
import { claimsTable, flatClaimant } from "../../lib/view/tax-settings/claims"
import { type GroupKey, groupCards } from "../../lib/view/tax-settings/groups"
import { incomeFlows, unlabelledIncome } from "../../lib/view/tax-settings/labels"
import { notStated } from "../../lib/view/tax-settings/not-stated"
import { isTaxed } from "../../lib/view/tax-settings/rows"
import { canClaimShared, sharedInterestClaimed } from "../../lib/view/tax-settings/shared-plan"
import TaxClaimNotes from "./TaxClaimNotes.svelte"
import TaxClaimsSection from "./TaxClaimsSection.svelte"
import TaxDrawer from "./TaxDrawer.svelte"
import TaxGroupCards from "./TaxGroupCards.svelte"
import TaxLabelForm from "./TaxLabelForm.svelte"
import TaxNotStated from "./TaxNotStated.svelte"
import TaxProfileRemove from "./TaxProfileRemove.svelte"

interface Props {
	name: string
	/** The plan as `scenario show` reads it: its profile, whether it is taxed, its document and the hash every Edit names. */
	show: ScenarioShow["scenario"]
	/** Whether the page changes anything: the server answers, and the page is not the Demo snapshot. */
	editable: boolean
	/** The CLI's own notes about the stored claims, one paragraph each. */
	notes?: readonly string[]
	/** The plan's tax years, whose assumptions the page echoes when two separate Returns share a home loan. */
	years?: readonly TaxYear[]
}

let { name, show, editable, notes = [], years = [] }: Props = $props()
const profile = $derived(show.tax ?? null)
const taxed = $derived(isTaxed(show))
/** The people of the plan's household, and the per-Return claims of a separate filing; both absent for one Return. */
const people = $derived(personNames(show.household))
/** The Filers the projection states, one column each: a profile with no Filer's Levy shows no claims table. */
const filers = $derived(returnsOf(years).map((one) => one.filer))
const claims = $derived(profile === null ? null : claimsTable(profile, show.household, filers))
// `traj` reads `shared=` only on a separate filing whose household names a partner and Owners: the form offers the field then.
const sharedClaimable = $derived(canClaimShared(show.household))
// A stored value is claimed now only on a separate profile whose Levies name a Filer; the cards say when it is kept instead.
const sharedClaimed = $derived(sharedInterestClaimed(profile, show.document))
/** The person whose claims the flat keys are, when a holder swap left them with the other person: the cards name them. */
const claimant = $derived(profile === null ? null : flatClaimant(profile, show.household, people))
// While an income Flow has no tax label `scenario tax` refuses. A plan with tax labels its Flows in the label form first; a plan
// with none labels them in the write that gives it tax, which the profile form carries.
const unlabelled = $derived(unlabelledIncome(show.document))
// A What-if session of this plan tries a change and saves nothing, and tax settings are saved, so it waits.
const trying = $derived(whatIfSession.active && whatIfSession.whatIf?.plan === name)
const offered = $derived(editable && (unlabelled.length === 0 || !taxed))
const wait = $derived(editSession.busy || trying)
let open = $state(false)
let group = $state<GroupKey | null>(null)
let openedOn = $state("")
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

/** Opens or shuts the drawer on a group; a refusal from an earlier save is forgotten, so it never shows on the next form. */
function showDrawer(next: boolean, on: GroupKey | null = null): void {
	editSession.clear()
	openedOn = show.contentHash
	group = on
	open = next
}
</script>

{#if editable && trying}
	<p role="status" class="rounded-md border border-border bg-muted p-3 text-sm text-foreground">Tax settings are saved, not tried. Apply or revert the what-if first, then change them here.</p>
{/if}
{#if editable && taxed && unlabelled.length > 0}
	<TaxLabelForm {name} {show} disabled={wait} />
{/if}
{#if claims}
	<TaxClaimsSection table={claims} {people} />
{/if}
{#if profile !== null}
	<TaxClaimNotes lines={notes} />
	<TaxGroupCards cards={groupCards(profile, claimant, sharedClaimed)} disabled={wait} onEdit={offered ? (on) => showDrawer(true, on) : undefined} />
	<TaxNotStated items={notStated(show.taxAllowances)} disabled={wait} onEdit={offered ? (on) => showDrawer(true, on) : undefined} />
{/if}
<div class="flex flex-wrap gap-3">
	{#if offered && profile === null}
		<button type="button" disabled={wait} onclick={() => showDrawer(true)} class={button}>Set the tax profile</button>
	{/if}
	{#if editable && taxed}<TaxProfileRemove {name} contentHash={show.contentHash} income={incomeFlows(show.document)} disabled={wait} />{/if}
</div>
<TaxDrawer open={open && !trying} {name} contentHash={show.contentHash} {openedOn} {profile} {group} {unlabelled} {sharedClaimable} onClose={() => showDrawer(false)} />
