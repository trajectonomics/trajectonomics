<script lang="ts">
import { queryParam, setQueryParam } from "../../client/query-param.svelte.js"
import EstatePage from "../../components/pages/EstatePage.svelte"
</script>

<svelte:head>
	<title>Estate · Dashboard</title>
</svelte:head>

<EstatePage
	scenario={queryParam("scenario", "")}
	terms={queryParam("terms", "both")}
	onTerms={(value) => setQueryParam("terms", value)}
	at={queryParam("at", "")}
	onAt={(value) => setQueryParam("at", value)}
/>
