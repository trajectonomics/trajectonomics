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

<!-- The brand mark, then the product name over the name of this app: the link back to Home. It fits the side navigation's width. -->
<SiteLink
	href="/"
	onclick={onNavigate}
	class="flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
>
	<span aria-hidden="true" class="flex size-8 shrink-0 [&>svg]:size-8">{@html artwork}</span>
	<span class="flex min-w-0 flex-col leading-tight">
		<span class="truncate font-semibold">Trajectonomics</span>
		<span class="truncate text-xs text-muted-foreground">Dashboard</span>
	</span>
</SiteLink>
