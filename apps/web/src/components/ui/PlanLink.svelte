<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAnchorAttributes } from "svelte/elements"
import { followPlanLink } from "../../client/plan-link.js"
import SiteLink from "./SiteLink.svelte"

interface Props extends Omit<HTMLAnchorAttributes, "href"> {
	/** A path on the Dashboard that names a plan, such as "/tax/?scenario=base". */
	href: string
	/** The plan the link names: following the link switches the page's plan first (web ADR 0010). */
	plan: string
	children: Snippet
}

/** A link that names a plan: it switches the page's plan, and stays on the page when the switch is refused. */
let { href, plan, children, ...rest }: Props = $props()
</script>

<SiteLink {href} {...rest} onclick={(event) => followPlanLink(event, plan)}>{@render children()}</SiteLink>
