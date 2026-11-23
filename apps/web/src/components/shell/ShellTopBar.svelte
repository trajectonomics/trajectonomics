<script lang="ts">
import { shellPanels } from "../../client/shell.svelte.js"
import { cx } from "../ui/cx"
import NavIcon from "./NavIcon.svelte"
import SnapshotStatus from "./SnapshotStatus.svelte"

interface Props {
	/** The label of the page being rendered, such as "Net worth". */
	title: string
}

let { title }: Props = $props()
let menuButton: HTMLButtonElement | undefined = $state()
let wasOpen = false

// When the menu drawer closes, focus goes back to the button that opened it, so a keyboard reader keeps
// their place. The button is hidden on a wide screen, where the drawer never opens.
$effect(() => {
	const open = shellPanels.menu
	if (wasOpen && !open) menuButton?.focus()
	wasOpen = open
})

const BUTTON = cx(
	"inline-flex shrink-0 items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm",
	"text-muted-foreground hover:text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
)
</script>

<!-- The page's label, the menu button (narrow screens only), the Snapshot's status, and Display options. -->
<header class="print:hidden sticky top-0 z-20 border-b border-border bg-background">
	<div class="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 pt-3 sm:px-6">
		<button
			type="button"
			bind:this={menuButton}
			class={cx(BUTTON, "lg:hidden")}
			aria-controls="page-menu"
			aria-expanded={shellPanels.menu}
			onclick={() => (shellPanels.menu = true)}
		>
			<NavIcon name="menu" />
			<span class="sr-only">Open the menu</span>
		</button>
		<p class="min-w-0 flex-1 truncate font-semibold">{title}</p>
		<button
			type="button"
			class={BUTTON}
			aria-haspopup="dialog"
			onclick={() => (shellPanels.options = true)}
		>
			<NavIcon name="sliders-horizontal" />
			Display options
		</button>
	</div>
	<div class="mx-auto w-full max-w-6xl px-4 sm:px-6">
		<SnapshotStatus />
	</div>
</header>
