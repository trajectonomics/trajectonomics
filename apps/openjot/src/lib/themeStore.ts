// The theme the app is painting with and the mascot it shows, so a component that only
// draws a decoration or a mascot can follow them without every caller passing a prop.
// +page.svelte keeps both in step with their saved values.
import { writable } from "svelte/store";
import { loadSavedMascot, type Mascot } from "./mascot";
import { loadSavedTheme, type AppTheme } from "./theme";

export const activeTheme = writable<AppTheme>(loadSavedTheme());
export const activeMascot = writable<Mascot>(loadSavedMascot());
