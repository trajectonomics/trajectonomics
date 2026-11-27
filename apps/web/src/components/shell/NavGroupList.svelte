<script lang="ts">
import { navGroups } from "../../client/nav-groups.svelte.js"
import type { NavGroup } from "../../lib/view/routes"
import { navGroupId, routesShown } from "../../lib/view/routes"
import { cx } from "../ui/cx"
import SiteLink from "../ui/SiteLink.svelte"
import NavIcon from "./NavIcon.svelte"

interface Props {
	group: NavGroup
	/** The path of the page being rendered. Its entry is marked, and its group stays open. */
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
	/** The words a small accent dot on the heading says, such as "1 thing to check". */
	warning?: string | null
}

let {
	group,
	current,
	onNavigate,
	planDocument = true,
	milestones = true,
	cashflow = true,
	levy = true,
	warning = null,
}: Props = $props()
const routes = $derived(routesShown(group, planDocument, milestones, cashflow, levy))
const holdsCurrent = $derived(routes.some((route) => route.path === current))
const open = $derived(
	group.heading === null || holdsCurrent || navGroups.isOpen(group.heading, group.defaultOpen),
)
</script>

{#snippet links()}
	{#each routes as route (route.path)}
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
{/snippet}

{#if group.heading === null}
	<ul class="space-y-1">{@render links()}</ul>
{:else}
	<div>
		<h2>
			<button
				type="button"
				aria-expanded={open}
				aria-controls={navGroupId(group.heading)}
				onclick={() => navGroups.toggle(group.heading, group.defaultOpen)}
				class="flex w-full items-center gap-2 rounded-md px-3 pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
			>
				{group.heading}
				{#if warning}
					<span
						role="img"
						aria-label={warning}
						title={warning}
						class="size-2 rounded-full bg-accent"
					></span>
				{/if}
				<span class={cx("ml-auto transition-transform", open && "rotate-180")}>
					<NavIcon name="chevron-down" />
				</span>
			</button>
		</h2>
		<ul id={navGroupId(group.heading)} hidden={!open} class="space-y-1">{@render links()}</ul>
	</div>
{/if}
