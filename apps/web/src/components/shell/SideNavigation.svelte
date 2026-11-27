<script lang="ts">
import { shellPanels } from "../../client/shell.svelte.js"
import type { PlanRow } from "../../lib/view/plans/rows"
import { cx } from "../ui/cx"
import NavIcon from "./NavIcon.svelte"
import PlanSwitcher from "./PlanSwitcher.svelte"
import SiteBrand from "./SiteBrand.svelte"
import SiteNavLinks from "./SiteNavLinks.svelte"

interface Props {
	/** The brand mark's SVG, with its role and title removed. */
	brand: string
	/** The path of the page being rendered. It is marked as the current page. */
	current: string
	/** The Scenario names the Snapshot holds, and the one the pages show. */
	names: readonly string[]
	selected: string
	onPlan: (name: string) => unknown
	/** What the Snapshot says of each plan, for the Main tag, the notes icon and the plan menus. */
	rows?: readonly PlanRow[]
	/** Whether the server answers Edits, so the plan switcher offers a plan's menu and a new plan. */
	editable?: boolean
	/** Whether the Snapshot holds the selected plan's document, which the planner pages need. */
	planDocument?: boolean
	/** Whether the selected plan's projection has milestones, which the Milestones page needs. */
	milestones?: boolean
	/** Whether the selected plan's projection has its cash flow table, which the Cash flow page needs. */
	cashflow?: boolean
	/** Whether the selected plan has a Levy, which the Optimize pages need. */
	levy?: boolean
}

let {
	brand,
	current,
	names,
	selected,
	onPlan,
	rows = [],
	editable = false,
	planDocument = true,
	milestones = true,
	cashflow = true,
	levy = true,
}: Props = $props()
let closeButton: HTMLButtonElement | undefined = $state()

function close(): void {
	shellPanels.closeMenu()
}

// On a narrow screen the menu drawer takes focus when it opens, so a keyboard reader can reach it.
$effect(() => {
	if (shellPanels.menu) closeButton?.focus()
})
</script>

<!-- Fixed on a wide screen. On a narrow one it is a drawer, opened by the top bar's menu button. -->
<aside
	id="page-menu"
	class={cx(
		"print:hidden fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto border-r border-border bg-background px-4 py-5 transition-transform",
		"lg:visible lg:w-60 lg:max-w-none lg:translate-x-0",
		shellPanels.menu ? "visible translate-x-0" : "invisible -translate-x-full",
	)}
>
	<div class="flex items-center justify-between gap-2">
		<SiteBrand artwork={brand} onNavigate={close} />
		<button
			type="button"
			bind:this={closeButton}
			onclick={close}
			class="inline-flex rounded-md p-1.5 text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring lg:hidden"
		>
			<NavIcon name="x" />
			<span class="sr-only">Close the menu</span>
		</button>
	</div>
	<SiteNavLinks {current} onNavigate={close} {planDocument} {milestones} {cashflow} {levy} />
	<div class="mt-auto">
		<PlanSwitcher {names} {selected} onChange={onPlan} {editable} {rows} />
	</div>
</aside>
{#if shellPanels.menu}
	<button
		type="button"
		tabindex="-1"
		aria-label="Close the menu"
		onclick={close}
		class="fixed inset-0 z-30 cursor-default bg-black/40 lg:hidden"
	></button>
{/if}
