// The theme the app is painting with, so a component that only draws a mascot or a
// decoration can follow it without every caller passing a prop. +page.svelte sets it
// in the same effect that writes `saveTheme`.
import { writable } from "svelte/store";
import { loadSavedTheme, type AppTheme } from "./theme";

export const activeTheme = writable<AppTheme>(loadSavedTheme());
