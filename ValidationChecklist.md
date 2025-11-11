# unum Validation Checklist

## Migration to PluresDB
- [x] Update README.md to reference PluresDB instead of Gun.js
- [x] Update package.json description and keywords for PluresDB
- [x] Update store.js with PluresStore class and PluresDB references
- [x] Update index.js with pluresComponent function and PluresDB references
- [x] Update actions.js with pluresList and PluresDB references
- [x] Update runes.js with pluresData, pluresDerived, pluresBind and PluresDB references
- [x] Update GunContext.js to PluresContext with PluresDB references (removed $app/environment dependency)
- [x] Rename gun-helper.js to plures-helper.js and update references
- [x] Update tsconfig.json to support JavaScript compilation
- [x] Update tests to use .js extensions and PluresDB terminology
- [x] All tests passing (14 tests)
- [x] Build passes successfully
- [x] Maintain backward compatibility with Gun.js terminology (legacy exports)

## Package Rename and Configuration
- [x] Rename package from "svgun" to "unum" in package.json
- [x] Rename package from "svgun" to "unum" in deno.json
- [x] Update workspace file name from "svgun-lib.code-workspace" to "unum.code-workspace"
- [x] Update GitHub repository information in package.json
- [x] Update version to "0.1.0" (initial release)

## Documentation
- [x] Update README.md with new package name and PluresDB references
- [x] Ensure documentation reflects actual API
- [x] Add installation instructions for both npm and Deno
- [x] Document PluresDB compatibility and migration path from Gun.js

## Source Code
- [x] Update all references from "svGun-lib" to "unum" in comments and code
- [x] Update all references from Gun.js to PluresDB
- [x] Ensure consistent exports between npm and Deno versions
- [x] Clean up any unused files or test code
- [x] Update import statements to reflect new package name
- [x] Maintain backward compatibility exports

## Build System
- [x] Verify TypeScript configuration works for both npm and Deno
- [x] Update build scripts for dual-target publishing
- [x] Verify dist folder structure is correct
- [x] Support JavaScript source files in TypeScript build

## Testing
- [x] Run all tests to ensure functionality works
- [x] Update tests to use PluresDB terminology
- [x] Verify backward compatibility with Gun.js legacy exports
- [x] Verify examples work with new package name

## Publishing
- [ ] Update npm publishing configuration for PluresDB version
- [ ] Update Deno publishing configuration for PluresDB version
- [ ] Set up proper version tags for PluresDB release

## Final Verification
- [ ] Test installation from both npm and Deno
- [ ] Verify the package works with PluresDB in a sample Svelte project
- [ ] Verify backward compatibility with Gun.js
- [x] Make sure LICENSE file is included in the package 

## Examples
- [ ] Update examples to demonstrate PluresDB integration
- [ ] Update Deno-specific example for PluresDB
- [ ] Test examples in respective environments
- [ ] Document required permissions for Deno example

## Notes on PluresDB Migration
PluresDB is a P2P graph database inspired by Gun.js with a Gun.js-compatible API. The migration primarily involves:
- Renaming variables and comments from "gun" to "plures" or "db"
- Updating documentation to reference PluresDB
- Maintaining backward compatibility through legacy exports
- The core API remains compatible since PluresDB implements Gun.js-compatible methods (get, put, on, once, map, etc.)