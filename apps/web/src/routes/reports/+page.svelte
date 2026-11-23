<script lang="ts">
import { queryParam } from "../../client/query-param.svelte.js"
import ReportsPage from "../../components/pages/ReportsPage.svelte"
</script>

<svelte:head>
	<title>Reports · Dashboard</title>
</svelte:head>

<ReportsPage scenario={queryParam("scenario", "")} terms={queryParam("terms", "both")} />
