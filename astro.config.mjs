// @ts-check
import { defineConfig } from "astro/config";

const base = process.env.CI ? "/josh-hudson-thoughts" : "/";

// https://astro.build/config
export default defineConfig({
  base,
});
