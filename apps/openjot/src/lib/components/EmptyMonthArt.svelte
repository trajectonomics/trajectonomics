<script lang="ts">
  import { activeMascot } from "$lib/themeStore";

  let { alt = "Empty month" }: { alt?: string } = $props();

  // The sitting robot waits with you rather than looking lost at an empty month. Copied
  // from apps/site/public/mascot/sit.webp into static/mascot/robot/ (offline bundle).
  // The Mascot setting decides between it and the sleeping pig below.
  const robot = $derived($activeMascot === "robot");
</script>

{#if robot}
  <img src="/mascot/robot/sit.webp" {alt} class="h-24 w-28 object-contain select-none" />
{:else}
<!--
  Distinct from the hero mascot photo: a flat receipt with a sleeping pig mark.
  Colors follow the active theme.
-->
<svg
  class="w-28 h-24"
  viewBox="0 0 112 96"
  fill="none"
  role="img"
  aria-label={alt}
>
  <rect
    x="22"
    y="10"
    width="68"
    height="76"
    rx="10"
    fill="var(--bg-card-sub)"
    stroke="var(--brand-border)"
    stroke-width="2"
  />
  <path
    d="M22 28h68"
    stroke="var(--border-strong)"
    stroke-width="2"
    stroke-dasharray="3 4"
  />
  <circle cx="56" cy="50" r="14" fill="var(--brand-soft)" stroke="var(--brand)" stroke-width="2" />
  <circle cx="51" cy="48" r="1.4" fill="var(--brand-deep)" />
  <circle cx="61" cy="48" r="1.4" fill="var(--brand-deep)" />
  <path
    d="M50 54c2 2 10 2 12 0"
    stroke="var(--brand-deep)"
    stroke-width="1.6"
    stroke-linecap="round"
  />
  <path
    d="M68 44c6-2 10 2 10 6"
    stroke="var(--text-muted)"
    stroke-width="1.6"
    stroke-linecap="round"
  />
  <circle cx="80" cy="42" r="1.2" fill="var(--text-muted)" />
  <path
    d="M34 70h44M34 76h28"
    stroke="var(--border-strong)"
    stroke-width="2"
    stroke-linecap="round"
  />
</svg>
{/if}
