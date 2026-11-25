<script lang="ts">
  import { X, ZoomIn, ZoomOut } from "@lucide/svelte";

  let {
    src,
    title = "Bank Slip",
    onClose,
  }: {
    src: string;
    title?: string;
    onClose: () => void;
  } = $props();

  let zoom = $state<1 | 2>(1);

  const imageStyle = $derived(
    zoom === 2 ? "width: 200%; max-width: none;" : "width: 100%; max-width: 100%;"
  );
  const containerJustify = $derived(zoom === 1 ? "justify-center" : "justify-start");
</script>

<!-- Fullscreen slip viewer -->
<div
  class="fixed inset-0 z-[60] flex flex-col bg-black/95 text-white overscroll-contain"
>
  <!-- Top bar extends seamlessly behind status bar -->
  <header
    class="flex items-center gap-3 px-4 pb-3 bg-black/90 border-b border-white/10 shrink-0"
    style="padding-top: max(env(safe-area-inset-top), 36px);"
  >
    <h2 class="min-w-0 flex-1 truncate text-base font-semibold text-white">
      {title}
    </h2>

    <button
      type="button"
      onclick={() => (zoom = zoom === 1 ? 2 : 1)}
      class="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors {zoom === 2
        ? 'bg-[var(--brand-text)] text-[var(--ds-color-accent-foreground)]'
        : 'bg-white/10 text-white active:bg-white/20'}"
      aria-label={zoom === 1 ? "Zoom in" : "Zoom out"}
    >
      {#if zoom === 1}
        <ZoomIn class="size-4" />
      {:else}
        <ZoomOut class="size-4" />
      {/if}
      <span>{zoom}x</span>
    </button>

    <button
      type="button"
      onclick={onClose}
      class="size-10 flex items-center justify-center rounded-full bg-white/10 text-white transition-colors active:bg-white/20"
      aria-label="Close"
    >
      <X class="size-6" />
    </button>
  </header>

  <!-- Scrollable, centered image -->
  <div
    class="min-h-0 flex-1 overflow-auto overscroll-contain px-3 pt-2 flex items-start {containerJustify}"
    style="padding-bottom: max(env(safe-area-inset-bottom), 24px);"
  >
    <img
      {src}
      alt={title}
      class="object-contain shrink-0 origin-top select-none transition-[width] duration-200 ease-out"
      style={imageStyle}
    />
  </div>
</div>
