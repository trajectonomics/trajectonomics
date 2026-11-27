<script lang="ts">
import { page } from "$app/state"
import { editSession } from "../../client/edit.svelte.js"
import { queryParam, setQueryParam } from "../../client/query-param.svelte.js"
import ProjectionPage from "../../components/pages/ProjectionPage.svelte"
import { editsShown } from "../../lib/edit/shown"
</script>

<svelte:head>
	<title>Plan · Dashboard</title>
</svelte:head>

<ProjectionPage
	scenario={queryParam("scenario", "")}
	editable={editsShown(editSession.token, page.url.search)}
	terms={queryParam("terms", "both")}
	onTerms={(value) => setQueryParam("terms", value)}
	chart={queryParam("chart", "")}
	onChart={(id) => setQueryParam("chart", id)}
	items={queryParam("items", "income")}
	onItems={(value) => setQueryParam("items", value)}
/>
