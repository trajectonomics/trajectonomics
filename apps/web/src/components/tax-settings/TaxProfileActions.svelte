<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import type { TaxProfile } from "../../lib/contract"
import Drawer from "../ui/Drawer.svelte"
import StaleNotice from "../ui/StaleNotice.svelte"
import TaxProfileForm from "./TaxProfileForm.svelte"
import TaxProfileRemove from "./TaxProfileRemove.svelte"

interface Props {
	name: string
	/** The content hash of the plan the page read, which every Edit names (cli ADR 0055). */
	contentHash: string
	profile: TaxProfile | null
	/** Whether the plan holds a tax Levy, with or without a stored profile. */
	taxed: boolean
}

let { name, contentHash, profile, taxed }: Props = $props()
let open = $state(false)
const title = $derived(profile === null ? "Set the tax profile" : "Change the tax profile")
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

/** Opens or shuts the drawer; a refusal from an earlier save is forgotten, so it never shows on the next form. */
function show(next: boolean): void {
	editSession.clear()
	open = next
}
</script>

<div class="flex flex-wrap gap-3">
	<button type="button" disabled={editSession.busy} onclick={() => show(true)} class={button}>{title}</button>
	{#if taxed}<TaxProfileRemove {name} {contentHash} />{/if}
</div>
<Drawer {open} {title} onClose={() => show(false)}>
	<StaleNotice />
	{#if open}<TaxProfileForm {name} {contentHash} {profile} onDone={() => show(false)} />{/if}
</Drawer>
