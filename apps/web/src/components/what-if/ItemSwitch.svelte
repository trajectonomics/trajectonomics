<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import { isOff } from "../../lib/what-if/session"

interface Props {
	/** The plan the switch changes in its session, and the content hash the page read for it. */
	plan: string
	contentHash: string
	/** The item's path, such as `flows.gym`: a switch off is a Removal of it. */
	path: string
	/** The item's id, which names the switch to a screen reader. */
	label: string
	/** Opens the item's drawer in what-if mode, where a value is tried rather than saved. */
	onTry: () => void
}

let { plan, contentHash, path, label, onTry }: Props = $props()
const off = $derived(whatIfSession.whatIf !== null && isOff(whatIfSession.whatIf, path))
const button =
	"rounded-md border border-border bg-card px-2.5 py-1 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
</script>

<!-- A what-if control per item: the switch takes it out of the what-if, and "Try a value" sets one field of it. -->
<div class="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-sm">
	<label class="inline-flex items-center gap-2">
		<input
			type="checkbox"
			role="switch"
			aria-label="Include {label} in the what-if"
			checked={!off}
			onchange={(event) => whatIfSession.setOff(plan, contentHash, path, !event.currentTarget.checked)}
			class="size-4 accent-primary"
		/>
		<span>{off ? "Off in this what-if" : "On"}</span>
	</label>
	<button type="button" onclick={onTry} class={button}>Try a value</button>
</div>
