<script lang="ts">
import SiteLink from "../ui/SiteLink.svelte"

interface Props {
	/** The brand mark's SVG, with its role and title removed: the link names itself. */
	artwork: string
	/** Runs when the link is followed, so the menu drawer on a narrow screen closes. */
	onNavigate?: () => void
}

let { artwork, onNavigate }: Props = $props()
</script>

<!-- The brand mark, the product name and the name of this app: the link back to Overview. -->
<SiteLink
	href="/"
	onclick={onNavigate}
	class="flex items-center gap-3 rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
>
	<span aria-hidden="true" class="flex size-8 shrink-0 [&>svg]:size-8">{@html artwork}</span>
	<span class="font-semibold whitespace-nowrap">Trajectonomics</span>
	<span class="hidden truncate text-sm text-muted-foreground sm:inline">Dashboard</span>
</SiteLink>
