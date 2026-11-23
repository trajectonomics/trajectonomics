<script lang="ts">
import { queryParam } from "../../client/query-param.svelte.js"
import NetWorthPage from "../../components/pages/NetWorthPage.svelte"
</script>

<svelte:head>
	<title>Net worth · Dashboard</title>
</svelte:head>

<NetWorthPage scenario={queryParam("scenario", "")} />
