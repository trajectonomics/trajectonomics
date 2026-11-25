<script lang="ts">
import { page } from "$app/state"
import { editSession } from "../../client/edit.svelte.js"
import { queryParam } from "../../client/query-param.svelte.js"
import RoutingPage from "../../components/pages/RoutingPage.svelte"
import { editsShown } from "../../lib/edit/shown"
</script>

<svelte:head>
	<title>Where money goes · Dashboard</title>
</svelte:head>

<RoutingPage
	scenario={queryParam("scenario", "")}
	editable={editsShown(editSession.token, page.url.search)}
/>
