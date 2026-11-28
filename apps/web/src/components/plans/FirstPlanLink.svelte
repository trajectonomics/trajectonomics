<script lang="ts">
import { currentSearch } from "../../client/location.svelte.js"
import { withSearch } from "../../lib/view/links"
</script>

<!-- The one way into the guided first plan before there is a plan to show. Every link takes the base path. -->
<p>
	<a
		class="underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
		href={withSearch("/plans/new/", currentSearch())}>Set up a first plan</a
	>
</p>
