<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import type { ScenarioDocument } from "../../lib/contract"
import Drawer from "../ui/Drawer.svelte"
import StaleNotice from "../ui/StaleNotice.svelte"
import EstateForm from "./EstateForm.svelte"

interface Props {
	name: string
	contentHash: string
	plan: ScenarioDocument
}

let { name, contentHash, plan }: Props = $props()
let open = $state(false)
const has = $derived((plan.estate?.costs?.length ?? 0) + (plan.estate?.gifts?.length ?? 0) > 0)
const title = $derived(has ? "Change your estate lines" : "Set your estate lines")
</script>

<!-- The button opens the right-side drawer: one form, one Edit, or a try in the What-if session. -->
<div>
	<button type="button" disabled={editSession.busy} onclick={() => (open = true)} class="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">{title}</button>
</div>
<Drawer {open} {title} onClose={() => (open = false)}>
	<StaleNotice />
	{#if open}<EstateForm {name} {contentHash} {plan} onDone={() => (open = false)} />{/if}
</Drawer>
