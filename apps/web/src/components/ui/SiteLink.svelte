<script lang="ts">
import type { Snippet } from "svelte"
import type { HTMLAnchorAttributes } from "svelte/elements"
import { currentSearch } from "../../client/location.svelte.js"
import { withSearch } from "../../lib/view/links"

interface Props extends Omit<HTMLAnchorAttributes, "href"> {
	/** A path on the Dashboard, such as "/net-worth/". The query string of the page is added to it. */
	href: string
	children: Snippet
}

let { href, children, ...rest }: Props = $props()
</script>

<a href={withSearch(href, currentSearch())} {...rest}>{@render children()}</a>
