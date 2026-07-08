import * as esbuild from "npm:esbuild@0.25.8";

await Deno.mkdir("src/ui/dist", { recursive: true });

try {
  await esbuild.build({
    absWorkingDir: Deno.cwd(),
    bundle: true,
    entryPoints: ["src/ui/dashboard/main.tsx"],
    format: "esm",
    jsx: "automatic",
    loader: {
      ".css": "text",
    },
    logLevel: "info",
    outfile: "src/ui/dist/app.js",
    platform: "browser",
  });
} finally {
  esbuild.stop();
}

await Deno.copyFile("src/ui/dashboard/styles.css", "src/ui/dist/styles.css");
