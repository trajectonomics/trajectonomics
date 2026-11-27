<script lang="ts">
import { afterNavigate } from "$app/navigation"
import { preferences } from "../../client/preferences.svelte.js"
import { shellPanels } from "../../client/shell.svelte.js"
import { currentSnapshot } from "../../client/snapshot.svelte.js"
import { formatDate } from "../../lib/format"
import type { PlanRow } from "../../lib/view/plans/rows"
import { cx } from "../ui/cx"
import NavIcon from "./NavIcon.svelte"
import PlanButton from "./PlanButton.svelte"
import SnapshotStatus from "./SnapshotStatus.svelte"

interface Props {
	/** The Scenario names the Snapshot holds, and the one the pages show. */
	names: readonly string[]
	selected: string
	onPlan: (name: string) => unknown
	/** What the Snapshot says of each plan, for the Main tag. */
	rows?: readonly PlanRow[]
	/** Whether the server answers Edits, so the plan menu offers a new plan. */
	editable?: boolean
}

let { names, selected, onPlan, rows = [], editable = false }: Props = $props()
const snapshotState = $derived(currentSnapshot())
const asOf = $derived(
	snapshotState.status === "ready" ? formatDate(snapshotState.snapshot.params.asOf) : null,
)

let menuButton: HTMLButtonElement | undefined = $state()
let wasOpen = false

// When the menu drawer closes, focus goes back to the button that opened it, so a keyboard reader keeps
// their place. The button is hidden on a wide screen, where the drawer never opens.
$effect(() => {
	const open = shellPanels.menu
	if (wasOpen && !open) menuButton?.focus()
	wasOpen = open
})

// A link in the drawer is followed, so SvelteKit puts focus back on the body: the menu button takes it again.
afterNavigate(() => {
	if (!shellPanels.menuFocusPending) return
	shellPanels.menuFocusPending = false
	menuButton?.focus()
})

const BUTTON = cx(
	"inline-flex size-[34px] shrink-0 items-center justify-center rounded-md border border-border bg-card",
	"text-muted-foreground hover:text-foreground",
	"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
)
</script>

<!-- The menu button (narrow screens), the plan slot, the As-of date and the display actions. -->
<header class="print:hidden sticky top-0 z-20 border-b border-border bg-background">
	<div class="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-2 sm:gap-3 sm:px-6">
		<button
			type="button"
			bind:this={menuButton}
			class={cx(BUTTON, "lg:hidden")}
			aria-controls="page-menu"
			aria-expanded={shellPanels.menu}
			aria-label="Open the menu"
			title="Open the menu"
			onclick={() => shellPanels.openMenu()}
		>
			<NavIcon name="menu" />
		</button>
		<div class="min-w-0 flex-1">
			<PlanButton {names} {selected} onChange={onPlan} {editable} {rows} />
		</div>
		{#if asOf !== null}
			<span
				class="hidden h-[34px] items-center rounded-md border border-border bg-card px-3 text-sm text-muted-foreground sm:inline-flex"
				title={`Figures as of ${asOf}`}><span class="sr-only">Figures as of </span>{asOf}</span
			>
		{/if}
		<button
			type="button"
			class={BUTTON}
			aria-pressed={preferences.hidden}
			aria-label="Hide amounts"
			title="Hide amounts"
			onclick={() => preferences.setHidden(!preferences.hidden)}
		>
			<NavIcon name={preferences.hidden ? "eye-off" : "eye"} />
		</button>
		<button
			type="button"
			class={BUTTON}
			aria-haspopup="dialog"
			aria-label="Display options"
			title="Display options"
			onclick={() => shellPanels.openOptions()}
		>
			<NavIcon name="sliders-horizontal" />
		</button>
	</div>
	<SnapshotStatus />
</header>
