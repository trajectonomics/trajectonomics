<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import { restoreSwitch } from "../ui/restore"

interface Props {
	plan: string
	/** The asset the item belongs to. */
	asset: string
	contentHash: string
	/** The id of the asset's Flow: a switch off is a Removal of `flows.<id>`. */
	id: string
	label: string
}

let { asset, plan, contentHash, id, label }: Props = $props()
const path = $derived(`flows.${id}`)
const off = $derived(whatIfSession.isOffIn(plan, path))

/** Makes the change the switch asks for; a refused one (another plan holds changes) puts the switch back. */
function change(control: HTMLInputElement): void {
	if (!whatIfSession.setOff(plan, contentHash, path, !control.checked)) restoreSwitch(control, !off)
}
</script>

<label class="inline-flex min-w-0 items-center gap-2">
	<input
		type="checkbox"
		role="switch"
		aria-label="Include {label} of {asset} in the what-if"
		checked={!off}
		disabled={whatIfSession.saving}
		onchange={(event) => change(event.currentTarget)}
		class="size-4 shrink-0 accent-primary"
	/>
	<span class="min-w-0">{label}{off ? ": off in this what-if" : ""}</span>
</label>
