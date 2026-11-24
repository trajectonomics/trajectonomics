<script lang="ts">
import { page } from "$app/state"
import { editSession } from "../../../client/edit.svelte.js"
import { queryParam } from "../../../client/query-param.svelte.js"
import AssumptionsPage from "../../../components/pages/AssumptionsPage.svelte"
import { editsShown } from "../../../lib/edit/shown"
</script>

<svelte:head>
	<title>Assumptions · Dashboard</title>
</svelte:head>

<AssumptionsPage
	scenario={queryParam("scenario", "")}
	editable={editsShown(editSession.token, page.url.search)}
/>
