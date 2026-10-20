import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
/** Extract the npm-bundled test browser without ownership changes in containers. */
export function prepareBrowser() {
  const require = createRequire(import.meta.url),
    root = dirname(dirname(require.resolve("@sparticuz/chromium"))),
    target = join(tmpdir(), "chromium");
  if (!existsSync(target)) {
    writeFileSync(
      target,
      brotliDecompressSync(readFileSync(join(root, "bin", "chromium.br"))),
    );
    chmodSync(target, 0o755);
  }
  for (const name of ["fonts.tar", "swiftshader.tar"]) {
    const archive = join(tmpdir(), name);
    writeFileSync(
      archive,
      brotliDecompressSync(readFileSync(join(root, "bin", name + ".br"))),
    );
    execFileSync("tar", ["--no-same-owner", "-xf", archive, "-C", tmpdir()]);
  }
  return target;
}
