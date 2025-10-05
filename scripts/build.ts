/**
 * Build script for SvGun library
 * 
 * This script:
 * 1. Cleans the dist directory
 * 2. Compiles TypeScript files
 * 3. Copies necessary files for distribution
 */

import { ensureDir, copy, emptyDir } from "https://deno.land/std@0.217.0/fs/mod.ts";

const DIST_DIR = "./dist";
const SRC_DIR = "./src";
const FILES_TO_COPY = ["LICENSE.md", "README.md"];

export async function build() {
  console.log("🏗️ Building SvGun library...");

  // Clean dist directory
  console.log("🧹 Cleaning dist directory...");
  await ensureDir(DIST_DIR);
  await emptyDir(DIST_DIR);

  // Compile TypeScript
  console.log("📦 Compiling TypeScript...");
  const tscCmd = new Deno.Command("npx", {
    args: ["tsc", "--project", "tsconfig.json"],
  });
  const tscOutput = await tscCmd.output();
  if (!tscOutput.success) {
    console.error("❌ TypeScript compilation failed");
    console.error(new TextDecoder().decode(tscOutput.stderr));
    Deno.exit(1);
  }

  // Copy additional files
  console.log("📋 Copying additional files...");
  for (const file of FILES_TO_COPY) {
    try {
      await copy(file, `${DIST_DIR}/${file}`, { overwrite: true });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ Could not copy ${file}: ${errorMessage}`);
    }
  }

  console.log("✅ Build completed successfully!");
}

if (import.meta.main) {
  await build();
} 