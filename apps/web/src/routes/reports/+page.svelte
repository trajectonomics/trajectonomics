<script lang="ts">
import { queryParam } from "../../client/query-param.svelte.js"
import ReportsPage from "../../components/pages/ReportsPage.svelte"
</script>

<ReportsPage scenario={queryParam("scenario", "")} terms={queryParam("terms", "both")} />
