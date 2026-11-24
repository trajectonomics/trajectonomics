<script lang="ts">
import type { TaxProfile } from "../../lib/contract"
import { GROUPS, type GroupKey } from "../../lib/view/tax-settings/groups"
import Drawer from "../ui/Drawer.svelte"
import StaleNotice from "../ui/StaleNotice.svelte"
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
	onClose: () => void
}

let { open, name, contentHash, openedOn, profile, group, unlabelled, onClose }: Props = $props()
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
		{#key contentHash}
			<TaxProfileForm {name} {contentHash} {profile} {group} {unlabelled} onDone={onClose} />
		{/key}
	{/if}
</Drawer>
