<script lang="ts">
import { page } from "$app/state"
import SiteLink from "../components/ui/SiteLink.svelte"
import { errorTitle } from "../lib/view/routes"

const title = $derived(errorTitle(page.status))
const reason = $derived(
	page.status === 404
		? "This page is not part of the Dashboard."
		: "The Dashboard could not show this page.",
)
</script>

<!-- An error page: the heading its status gives, one sentence, and the way back to Overview. -->
<section aria-labelledby="page-title" class="space-y-6">
	<header>
		<h1 id="page-title" class="text-xl font-semibold tracking-tight">{title}</h1>
	</header>
	<p class="max-w-prose text-muted-foreground">{reason}</p>
	<p>
		<SiteLink
			href="/"
			class="rounded-md underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
		>Back to Overview</SiteLink>
	</p>
</section>
