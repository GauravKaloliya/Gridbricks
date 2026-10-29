import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "dist", "assets");
const files = readdirSync(dir).filter((name) => name.endsWith(".js"));
const largest = files
  .map((name) => ({ name, bytes: statSync(join(dir, name)).size }))
  .sort((left, right) => right.bytes - left.bytes)[0];

if (!largest) {
  console.error("No JavaScript assets found in dist/assets");
  process.exit(1);
}

const limit = 500 * 1024;
if (largest.bytes > limit) {
  console.error(
    `Largest JS chunk ${largest.name} is ${(largest.bytes / 1024).toFixed(2)} kB, over the 500 kB budget`,
  );
  process.exit(1);
}

console.log(
  `  PASS  largest JS chunk ${largest.name} ${(largest.bytes / 1024).toFixed(2)} kB (< 500 kB)`,
);
