// Copies the Anchor build output (IDL + TS types) into @speakpay/shared.
// Run after every `anchor build`: `pnpm idl:sync`.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pairs = [
  ["target/idl/policy_vault.json", "packages/shared/src/idl/policy_vault.json"],
  ["target/types/policy_vault.ts", "packages/shared/src/idl/policy_vault.ts"],
];

let missing = false;
for (const [from, to] of pairs) {
  const src = join(root, from);
  if (!existsSync(src)) {
    console.error(`missing ${from} — run \`anchor build\` first`);
    missing = true;
    continue;
  }
  mkdirSync(dirname(join(root, to)), { recursive: true });
  copyFileSync(src, join(root, to));
  console.log(`copied ${from} -> ${to}`);
}
process.exit(missing ? 1 : 0);
