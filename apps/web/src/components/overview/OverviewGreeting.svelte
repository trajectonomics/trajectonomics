<script lang="ts">
import { asset } from "$app/paths"
</script>

<!-- The Site's hello pose (site ADR 0026), decoration beside Home's title: no words, no pointer, no focus. -->
<img
	data-overview-mascot
	src={asset("mascot/hello.webp")}
	alt=""
	aria-hidden="true"
	width={60}
	height={40}
	decoding="async"
	draggable="false"
	loading="eager"
	class="pointer-events-none h-10 w-[60px] shrink-0 select-none self-center print:hidden"
/>
