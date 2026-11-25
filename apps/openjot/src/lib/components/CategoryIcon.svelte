<script lang="ts">
  import {
    Utensils,
    Car,
    ShoppingBasket,
    ShoppingBag,
    Film,
    Home,
    HeartPulse,
    Users,
    Gift,
    Plane,
    GraduationCap,
    Briefcase,
    TrendingUp,
    CreditCard,
    Wallet,
    HandCoins,
    Store,
    RotateCcw,
    Leaf,
    Hash,
    Ellipsis,
    ArrowLeftRight,
    Sparkles,
    Coffee,
    Gamepad2,
    Dumbbell,
    PawPrint,
    Music,
    Shirt,
    BookOpen,
    Star,
    Smartphone,
  } from "@lucide/svelte";

  let {
    icon = "leaf",
    color = "#64748b",
    size = "md",
  }: { icon?: string; color?: string; size?: "sm" | "md" | "lg" } = $props();

  const boxClass = $derived(
    size === "sm"
      ? "size-8 rounded-full"
      : size === "lg"
        ? "size-12 rounded-full"
        : "size-10 rounded-full"
  );
  const iconClass = $derived(
    size === "sm" ? "size-4" : size === "lg" ? "size-6" : "size-5"
  );
</script>

<div
  class="{boxClass} flex items-center justify-center shrink-0"
  style="background-color: {color}22; color: {color}; border: 1px solid {color}44;"
>
  {#if icon === "utensils"}
    <Utensils class={iconClass} />
  {:else if icon === "coffee"}
    <Coffee class={iconClass} />
  {:else if icon === "car"}
    <Car class={iconClass} />
  {:else if icon === "shopping-basket"}
    <ShoppingBasket class={iconClass} />
  {:else if icon === "shopping-bag"}
    <ShoppingBag class={iconClass} />
  {:else if icon === "shirt"}
    <Shirt class={iconClass} />
  {:else if icon === "film"}
    <Film class={iconClass} />
  {:else if icon === "gamepad-2"}
    <Gamepad2 class={iconClass} />
  {:else if icon === "music"}
    <Music class={iconClass} />
  {:else if icon === "home"}
    <Home class={iconClass} />
  {:else if icon === "heart-pulse"}
    <HeartPulse class={iconClass} />
  {:else if icon === "dumbbell"}
    <Dumbbell class={iconClass} />
  {:else if icon === "users"}
    <Users class={iconClass} />
  {:else if icon === "paw-print"}
    <PawPrint class={iconClass} />
  {:else if icon === "gift"}
    <Gift class={iconClass} />
  {:else if icon === "plane"}
    <Plane class={iconClass} />
  {:else if icon === "graduation-cap"}
    <GraduationCap class={iconClass} />
  {:else if icon === "book-open"}
    <BookOpen class={iconClass} />
  {:else if icon === "briefcase"}
    <Briefcase class={iconClass} />
  {:else if icon === "trending-up"}
    <TrendingUp class={iconClass} />
  {:else if icon === "credit-card"}
    <CreditCard class={iconClass} />
  {:else if icon === "wallet"}
    <Wallet class={iconClass} />
  {:else if icon === "hand-coins"}
    <HandCoins class={iconClass} />
  {:else if icon === "store"}
    <Store class={iconClass} />
  {:else if icon === "rotate-ccw"}
    <RotateCcw class={iconClass} />
  {:else if icon === "smartphone"}
    <Smartphone class={iconClass} />
  {:else if icon === "sparkles"}
    <Sparkles class={iconClass} />
  {:else if icon === "star"}
    <Star class={iconClass} />
  {:else if icon === "hash"}
    <Hash class={iconClass} />
  {:else if icon === "transfer"}
    <ArrowLeftRight class={iconClass} />
  {:else if icon === "ellipsis"}
    <Ellipsis class={iconClass} />
  {:else}
    <Leaf class={iconClass} />
  {/if}
</div>
