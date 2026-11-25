<script lang="ts">
import "../styles/global.css"
import mark from "@trajectonomics/brand/current/logo/mark.svg?raw"
import type { Snippet } from "svelte"
import { page } from "$app/state"
import { editSession } from "../client/edit.svelte.js"
import { queryParam } from "../client/query-param.svelte.js"
import { selectPlan } from "../client/select-plan.svelte.js"
import { shellPanels } from "../client/shell.svelte.js"
import { currentSnapshot, loadSnapshot } from "../client/snapshot.svelte.js"
import { whatIfSession } from "../client/what-if.svelte.js"
import PlanDrawer from "../components/plans/PlanDrawer.svelte"
import { brandArtwork } from "../components/shell/brand-artwork"
import DisplayOptions from "../components/shell/DisplayOptions.svelte"
import PrintHeader from "../components/shell/PrintHeader.svelte"
import ShellTopBar from "../components/shell/ShellTopBar.svelte"
import SideNavigation from "../components/shell/SideNavigation.svelte"
import WhatIfBar from "../components/what-if/WhatIfBar.svelte"
import { editsShown } from "../lib/edit/shown"
import { hasLevy } from "../lib/snapshot"
import { hasCashflow } from "../lib/view/cashflow/cashflow"
import { hasMilestones, projectionRead } from "../lib/view/milestones/milestones"
import { chooseScenario, projectedRows, scenarioNames } from "../lib/view/plan"
import { documentRead } from "../lib/view/plan-items/document"
import { printHeading } from "../lib/view/print-header"
import { navPath, pageTitle } from "../lib/view/routes"
import { isDemo } from "../lib/view/snapshot-url"

let { children }: { children: Snippet } = $props()
const artwork = brandArtwork(mark)
const names = $derived(scenarioNames(currentSnapshot()))
// What the Snapshot says of each plan the pages can show: the Main tag, the notes icon and the menus.
const rows = $derived(projectedRows(currentSnapshot()))
const selected = $derived(chooseScenario(names, queryParam("scenario", "")) ?? "")
const title = $derived(pageTitle(page.url.pathname))
// Edit controls show only when the server answered the token, and never in the Demo snapshot.
const editable = $derived(editsShown(editSession.token, page.url.search))
// The planner pages are listed only when the Snapshot holds the selected plan's read of its items.
const planDocument = $derived(documentRead(currentSnapshot(), selected) !== undefined)
// The Milestones page is listed only when the selected plan's projection carries a milestones table.
const milestones = $derived(hasMilestones(projectionRead(currentSnapshot(), selected)))
// The Cash flow page is listed only when the selected plan's projection carries its cash flow table.
const cashflow = $derived(hasCashflow(projectionRead(currentSnapshot(), selected)))
// The Optimize pages are listed only when the selected plan's document holds a Levy.
const levy = $derived(hasLevy(documentRead(currentSnapshot(), selected)))

// Every printed page opens with the plan, the As-of date and the terms (and says so for a What-if session).
const printed = $derived(
	printHeading(
		currentSnapshot(),
		selected,
		queryParam("terms", "both"),
		whatIfSession.lensFor(selected) !== null,
	),
)

// The Snapshot follows the address: this layout stays mounted across pages, so the read is started
// again whenever the query string changes. The loader reads each file once, so a page change with the
// same `demo` parameter costs nothing, and a switch to `?demo=1` loads the Demo snapshot.
$effect(() => {
	loadSnapshot(page.url.search)
})

// The token is asked for once per visit, and not at all for the Demo snapshot.
$effect(() => {
	if (!isDemo(page.url.search)) void editSession.open()
})
</script>

<SideNavigation
	brand={artwork}
	current={navPath(page.url.pathname)}
	{names}
	{selected}
	onPlan={selectPlan}
	{editable}
	{rows}
	{planDocument}
	{milestones}
	{cashflow}
	{levy}
/>
<PlanDrawer />
<!-- While the menu drawer is open on a narrow screen, the page behind it is inert: Tab stays in the drawer. -->
<div inert={shellPanels.menu} class="flex min-h-screen min-w-0 flex-1 flex-col print:pl-0 lg:pl-60">
	<ShellTopBar {title} />
	<WhatIfBar />
	<main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 print:px-0">
		<PrintHeader heading={printed} />
		{@render children()}
	</main>
	<footer class="border-t border-border">
		<p class="mx-auto w-full max-w-6xl px-4 py-4 text-sm text-muted-foreground sm:px-6">
			Every figure is a traj result. The Dashboard computes nothing.
		</p>
	</footer>
</div>
<DisplayOptions />
