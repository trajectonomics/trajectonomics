<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { GroupSpec } from "../../lib/what-if/session"
import { restoreSwitch } from "../ui/restore"

interface Props {
	/** The plan the switch changes in its session, and the content hash the page read for it. */
	plan: string
	contentHash: string
	/** The item's path, such as `flows.gym`: a switch off is a Removal of it. */
	path: string
	/** Other paths that switch off with this one: a salary's employer share is a Flow of its own (`UNKNOWN_FLOW` otherwise). */
	also?: string[]
	/** The item's id, which names the switch to a screen reader. */
	label: string
	/** Opens the item's drawer in what-if mode, where a value is tried rather than saved. */
	onTry: () => void
}

let { plan, contentHash, path, also = [], label, onTry }: Props = $props()
/** A salary and its employer share are one unit: the switch and the bar chip take both parts together. */
const unit: GroupSpec | null = $derived(
	also.length === 0
		? null
		: { kind: "salary", name: path.split(".")[1] ?? path, paths: [path, ...also] },
)
const off = $derived(
	whatIfSession.isOffIn(plan, path) || (unit !== null && whatIfSession.isGroupOffIn(plan, unit)),
)
const button =
	"rounded-md border border-border bg-card px-2.5 py-1 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

/** Makes the change the switch asks for; a refused one (another plan holds changes) puts the switch back. */
function change(control: HTMLInputElement): void {
	const made =
		unit === null
			? whatIfSession.setOff(plan, contentHash, path, !control.checked)
			: whatIfSession.setGroupOff(plan, contentHash, unit, unit.paths, !control.checked)
	if (!made) restoreSwitch(control, !off)
}
</script>

<!-- A what-if control per item: the switch takes it out of the what-if, and "Try a value" sets one field of it. -->
<div class="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-sm" data-also={also.join(" ") || undefined}>
	<label class="inline-flex items-center gap-2">
		<input
			type="checkbox"
			role="switch"
			aria-label="Include {label} in the what-if"
			checked={!off}
			disabled={whatIfSession.saving}
			onchange={(event) => change(event.currentTarget)}
			class="size-4 accent-primary"
		/>
		<span>{off ? "Off in this what-if" : "On"}</span>
	</label>
	<button type="button" onclick={onTry} disabled={whatIfSession.saving} class={button}>Try a value</button>
</div>
