<script lang="ts">
  export type MascotMood = "idle" | "scan" | "happy";

  let {
    mood = "idle",
    size = "md",
    interactive = true,
    alt = "OpenJot mascot",
    onTap,
  }: {
    mood?: MascotMood;
    size?: "sm" | "md" | "hero" | "lg";
    interactive?: boolean;
    alt?: string;
    onTap?: () => void;
  } = $props();

  let popping = $state(false);
  let fallback = $state(false);

  const src = $derived.by(() => {
    if (fallback) return "/app-icon.png";
    if (mood === "scan") return "/mascot/mascot-scan.webp";
    if (mood === "happy") return "/mascot/mascot-happy.webp";
    return "/mascot/mascot-idle.webp";
  });

  const sizeClass = $derived(
    size === "sm"
      ? "size-14"
      : size === "hero"
        ? "size-36"
        : size === "lg"
          ? "size-40"
          : "size-20"
  );

  function handleTap() {
    if (!interactive) return;
    popping = false;
    requestAnimationFrame(() => {
      popping = true;
    });
    setTimeout(() => (popping = false), 550);
    onTap?.();
  }
</script>

{#if interactive}
  <button
    type="button"
    onclick={handleTap}
    aria-label={alt}
    class="relative shrink-0 bg-transparent p-0 border-0 active:scale-95 transition-transform {sizeClass} {popping
      ? 'animate-moo-pop'
      : ''}"
  >
    <img
      {src}
      {alt}
      onerror={() => (fallback = true)}
      class="size-full object-contain select-none pointer-events-none"
    />
  </button>
{:else}
  <div class="relative shrink-0 {sizeClass}">
    <img
      {src}
      {alt}
      onerror={() => (fallback = true)}
      class="size-full object-contain select-none pointer-events-none"
    />
  </div>
{/if}
