<script lang="ts">
import { currentSnapshot } from "../../client/snapshot.svelte.js"
import { healthWarningLabel } from "../../lib/view/health/warning"
import { NAV_GROUPS } from "../../lib/view/routes"
import NavGroupList from "./NavGroupList.svelte"

interface Props {
	/** The path of the page being rendered, such as "/net-worth/". It is marked as the current page. */
	current: string
	/** Runs when a link is followed, so the menu drawer on a narrow screen closes. */
	onNavigate: () => void
	/** Whether the Snapshot holds the selected plan's document: the planner pages are listed only then. */
	planDocument?: boolean
	/** Whether the selected plan's projection has milestones: the Milestones page is listed only then. */
	milestones?: boolean
	/** Whether the selected plan's projection has its cash flow table: the Cash flow page is listed only then. */
	cashflow?: boolean
	/** Whether the selected plan has a Levy: the Optimize pages are listed only then. */
	levy?: boolean
}

let {
	current,
	onNavigate,
	planDocument = true,
	milestones = true,
	cashflow = true,
	levy = true,
}: Props = $props()
const state = $derived(currentSnapshot())
const warning = $derived(state.status === "ready" ? healthWarningLabel(state.snapshot) : null)
</script>

<!-- The pages in groups: a group with a heading, then the pages that belong to no group. -->
<nav aria-label="Pages" class="space-y-5">
	{#each NAV_GROUPS as group, index (index)}
		<NavGroupList
			{group}
			{current}
			{onNavigate}
			warning={group.heading === "Records" ? warning : null}
			{planDocument}
			{milestones}
			{cashflow}
			{levy}
		/>
	{/each}
</nav>
