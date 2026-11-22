<script lang="ts">
import { ROUTES } from "../../lib/view/routes"
import { cx } from "../ui/cx"
import SiteLink from "../ui/SiteLink.svelte"

interface Props {
	/** The path of the page being rendered, such as "/net-worth/". It is marked as the current page. */
	current: string
}

let { current }: Props = $props()
</script>

<!-- The eight pages in navigation order. On a narrow screen the row wraps, so no page is out of sight. -->
<nav aria-label="Pages">
	<ul class="flex flex-wrap gap-1 py-1">
		{#each ROUTES as route (route.path)}
			{@const isCurrent = route.path === current}
			<li>
				<SiteLink
					href={route.path}
					aria-current={isCurrent ? "page" : undefined}
					class={cx(
						"block whitespace-nowrap rounded-md px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-ring",
						isCurrent
							? "bg-secondary font-medium text-foreground"
							: "text-muted-foreground hover:text-foreground",
					)}>{route.label}</SiteLink
				>
			</li>
		{/each}
	</ul>
</nav>
