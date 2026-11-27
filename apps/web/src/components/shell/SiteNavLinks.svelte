<script lang="ts">
import { NAV_GROUPS, routesShown } from "../../lib/view/routes"
import { cx } from "../ui/cx"
import SiteLink from "../ui/SiteLink.svelte"
import NavIcon from "./NavIcon.svelte"

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
</script>

<!-- The pages in groups: a group with a heading, then the pages that belong to no group. -->
<nav aria-label="Pages" class="space-y-5">
	{#each NAV_GROUPS as group, index (index)}
		<div>
			{#if group.heading}
				<h2 class="px-3 pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
					{group.heading}
				</h2>
			{/if}
			<ul class="space-y-1">
				{#each routesShown(group, planDocument, milestones, cashflow, levy) as route (route.path)}
					{@const isCurrent = route.path === current}
					<li>
						<SiteLink
							href={route.path}
							aria-current={isCurrent ? "page" : undefined}
							onclick={onNavigate}
							class={cx(
								"flex items-center gap-3 rounded-md px-3 py-2 text-sm whitespace-nowrap outline-none focus-visible:outline-2 focus-visible:outline-ring",
								isCurrent
									? "bg-secondary font-medium text-foreground"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<NavIcon name={route.icon} />
							{route.label}
						</SiteLink>
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</nav>
