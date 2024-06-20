import { build } from "esbuild";
import { glob } from "glob";

(async function () {
  let entryPoints = await glob("src/**/*.ts");
  console.log("entryPoints", entryPoints);
  entryPoints = entryPoints.filter((p) => p !== "src/types.ts");

  build({
    entryPoints,
    logLevel: "info",
    outdir: "lib",
    bundle: false,
    minify: false,
    platform: "node",
    format: "cjs",
    sourcemap: "external",
    target: "node16",
  });
})();
