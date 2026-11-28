<script lang="ts">
import { queryParam } from "../client/query-param.svelte.js"
import OverviewPage from "../components/pages/OverviewPage.svelte"
</script>

<OverviewPage scenario={queryParam("scenario", "")} />
