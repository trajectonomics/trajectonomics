<script lang="ts">
  import { activeMascot } from "$lib/themeStore";

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

  // The Mascot setting shows either the brand's cream robot or Moo. The robot poses are
  // copied from apps/site/public/mascot/ (the Site's mascot renders) into
  // static/mascot/robot/ so the offline app bundles them. Only full-body poses: the Site's
  // `hello` and `peek` lean over an edge and look cut off on their own. Idle `wave` greets,
  // scan `open` examines the slip through its magnifier, happy `same` throws both arms up.
  const robot = $derived($activeMascot === "robot");

  const src = $derived.by(() => {
    if (fallback) return "/app-icon.png";
    if (robot) {
      if (mood === "scan") return "/mascot/robot/open.webp";
      if (mood === "happy") return "/mascot/robot/same.webp";
      return "/mascot/robot/wave.webp";
    }
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
