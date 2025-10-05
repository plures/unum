/**
 * NPM Publishing Script for SvGun
 * 
 * This script:
 * 1. Builds the project
 * 2. Creates a clean package.json for npm
 * 3. Publishes to npm registry
 */

import { build } from "./build.ts";

async function publishToNpm() {
  console.log("📦 Preparing SvGun for npm publishing...");

  // Step 1: Build the project
  console.log("🏗️ Building project...");
  await build();

  // Step 2: Run npm publish
  console.log("🚀 Publishing to npm...");
  const publishCmd = new Deno.Command("npm", {
    args: ["publish", "--access", "public"],
    cwd: Deno.cwd(),
  });

  const publishOutput = await publishCmd.output();
  if (!publishOutput.success) {
    console.error("❌ Failed to publish to npm");
    console.error(new TextDecoder().decode(publishOutput.stderr));
    Deno.exit(1);
  }

  console.log("✅ Successfully published to npm!");
}

if (import.meta.main) {
  await publishToNpm();
} 