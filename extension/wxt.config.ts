import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "OpenSEO Toolbar",
    description:
      "SEO metrics under every Google result, from your own DataForSEO account.",
    permissions: ["storage"],
    host_permissions: ["https://api.dataforseo.com/*"],
  },
});
