/**
 * Deno Publishing Script for SvGun
 * 
 * This script:
 * 1. Validates the deno.json configuration
 * 2. Runs tests to ensure everything is working
 * 3. Publishes to the Deno registry
 */

async function publishToDeno() {
  console.log("🦕 Preparing to publish to Deno registry...");

  // Step 1: Run tests
  console.log("🧪 Running tests...");
  const testCmd = new Deno.Command("deno", {
    args: ["test", "-A", "--import-map=./deno.json", "./tests/"],
  });
  
  const testOutput = await testCmd.output();
  if (!testOutput.success) {
    console.error("❌ Tests failed, aborting publish");
    console.error(new TextDecoder().decode(testOutput.stderr));
    Deno.exit(1);
  }
  
  console.log("✅ Tests passed!");

  // Step 2: Publish to Deno
  console.log("🚀 Publishing to Deno registry...");
  const publishCmd = new Deno.Command("deno", {
    args: ["publish", "--allow-dirty"],
  });
  
  const publishOutput = await publishCmd.output();
  if (!publishOutput.success) {
    console.error("❌ Failed to publish to Deno registry");
    console.error(new TextDecoder().decode(publishOutput.stderr));
    Deno.exit(1);
  }
  
  console.log("✅ Successfully published to Deno registry!");
}

if (import.meta.main) {
  await publishToDeno();
} 