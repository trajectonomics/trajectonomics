<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import type { TaxProfile } from "../../lib/contract"
import Drawer from "../ui/Drawer.svelte"
import StaleNotice from "../ui/StaleNotice.svelte"
import TaxLabelNotice from "./TaxLabelNotice.svelte"
import TaxProfileForm from "./TaxProfileForm.svelte"
import TaxProfileRemove from "./TaxProfileRemove.svelte"

interface Props {
	name: string
	/** The content hash of the plan the page read, which every Edit names (cli ADR 0055). */
	contentHash: string
	profile: TaxProfile | null
	/** Whether the plan holds a tax Levy, with or without a stored profile. */
	taxed: boolean
	/** The income Flows without a tax label: while there are any, `scenario tax` refuses, so the form is not offered. */
	unlabelled: readonly string[]
	/** Every income Flow of the plan, which a removal leaves without a tax label. */
	income: readonly string[]
}

let { name, contentHash, profile, taxed, unlabelled, income }: Props = $props()
let open = $state(false)
// The hash the form opened on: a plan that changed since is read again, and the form starts over from it.
let openedOn = $state("")
const title = $derived(profile === null ? "Set the tax profile" : "Change the tax profile")
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

/** Opens or shuts the drawer; a refusal from an earlier save is forgotten, so it never shows on the next form. */
function show(next: boolean): void {
	editSession.clear()
	openedOn = contentHash
	open = next
}
</script>

{#if unlabelled.length > 0}
	<TaxLabelNotice {name} flows={unlabelled} stored={profile !== null} />
{/if}
<div class="flex flex-wrap gap-3">
	{#if unlabelled.length === 0}
		<button type="button" disabled={editSession.busy} onclick={() => show(true)} class={button}>{title}</button>
	{/if}
	{#if taxed}<TaxProfileRemove {name} {contentHash} {income} />{/if}
</div>
<Drawer {open} {title} onClose={() => show(false)}>
	<StaleNotice />
	{#if open && openedOn !== contentHash}
		<p role="status" class="text-sm text-foreground">The plan changed since you opened this form, so it shows the stored profile again. Enter your change again.</p>
	{/if}
	{#if open}
		{#key contentHash}
			<TaxProfileForm {name} {contentHash} {profile} onDone={() => show(false)} />
		{/key}
	{/if}
</Drawer>
