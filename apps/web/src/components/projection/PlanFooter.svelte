<script lang="ts">
import SiteLink from "../ui/SiteLink.svelte"

/** The pages the Plan opens: its years, where its money goes, and the plans it can be compared with. */
const link = "text-accent underline-offset-4 hover:underline"
</script>

<nav aria-label="Plan pages" class="flex flex-wrap gap-4 text-sm">
	<SiteLink href="/projection/years/" class={link}>Year by year →</SiteLink>
	<SiteLink href="/routing/" class={link}>Where money goes →</SiteLink>
	<SiteLink href="/compare/" class={link}>Compare plans →</SiteLink>
</nav>
