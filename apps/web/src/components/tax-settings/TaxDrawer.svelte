<script lang="ts">
import type { TaxProfile } from "../../lib/contract"
import type { FlatClaimNoteParts } from "../../lib/view/tax-settings/flat-claims"
import { GROUPS, type GroupKey } from "../../lib/view/tax-settings/groups"
import Drawer from "../ui/Drawer.svelte"
import StaleNotice from "../ui/StaleNotice.svelte"
import TaxFlatClaimNote from "./TaxFlatClaimNote.svelte"
import TaxProfileForm from "./TaxProfileForm.svelte"

interface Props {
	/** Whether the drawer shows: it is shut inside a What-if session, which tries nothing here. */
	open: boolean
	name: string
	/** The content hash of the plan the page read, which every Edit names (cli ADR 0055). */
	contentHash: string
	/** The hash the drawer opened on: a plan that changed since is read again, and the form starts over from it. */
	openedOn: string
	profile: TaxProfile | null
	/** The group the drawer opened on; null opens it on every item. */
	group: GroupKey | null
	/** The income Flows with no tax label, which a whole write labels. */
	unlabelled: readonly string[]
	/** Whether the household names a partner and Owners, which `traj` needs for a `shared=` field; with none, it offers no field. */
	sharedClaimable?: boolean
	/** True after a holder swap, when a flat claim's field waits for `--from-stored`, and `flatClaimNote` says why. */
	flatClaimsLocked?: boolean
	flatClaimNote?: FlatClaimNoteParts | null
	onClose: () => void
}

let {
	open,
	name,
	contentHash,
	openedOn,
	profile,
	group,
	unlabelled,
	sharedClaimable = true,
	flatClaimsLocked = false,
	flatClaimNote = null,
	onClose,
}: Props = $props()
const title = $derived.by(() => {
	if (profile === null) return "Set the tax profile"
	const card = GROUPS.find((one) => one.key === group)
	return card === undefined ? "Change the tax profile" : `Edit ${card.title.toLowerCase()}`
})
</script>

<Drawer {open} {title} {onClose}>
	<StaleNotice />
	{#if open && openedOn !== contentHash}
		<p role="status" class="text-sm text-foreground">The plan changed since you opened this form, so it shows the stored profile again. Enter your change again.</p>
	{/if}
	{#if open}
		{#if flatClaimsLocked && flatClaimNote}
			<TaxFlatClaimNote note={flatClaimNote} />
		{/if}
		{#key contentHash}
			<TaxProfileForm {name} {contentHash} {profile} {group} {unlabelled} {sharedClaimable} {flatClaimsLocked} onDone={onClose} />
		{/key}
	{/if}
</Drawer>
