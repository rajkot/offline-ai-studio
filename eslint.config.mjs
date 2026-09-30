import nextPlugin from "@next/eslint-plugin-next";

export default [
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  {
    ignores: [
      ".next/**",
      "dist/**",
      "node_modules/**",
      "public/release/**",
      "integrations/**",
      "open-code-review/**",
      "open-jarvis/**",
      "ruflo/**",
      "desktop-app/**",
      "scientific-skills/**",
      "strands-tools/**",
      "superpowers/**",
      "jev-ultrafast/**",
      "codebase-memory-mcp/**",
      "awesome-llm-apps/**",
      "awesome-nano-banana-pro-prompts-main/**",
      "agency-agents/**",
      "New folder/**",
      "test-output/**",
      "tests-suite/**",
      "**/*.min.js"
    ],
  },
];
