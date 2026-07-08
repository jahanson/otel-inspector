import "npm:esbuild@0.25.8";

await Deno.mkdir("src/ui/dist", { recursive: true });

const esbuildBinary = Deno.build.os === "windows"
  ? "node_modules/.deno/@esbuild+win32-x64@0.25.8/node_modules/@esbuild/win32-x64/esbuild.exe"
  : "node_modules/.deno/@esbuild+linux-x64@0.25.8/node_modules/@esbuild/linux-x64/bin/esbuild";

const result = await new Deno.Command(esbuildBinary, {
  args: [
    "src/ui/dashboard/main.tsx",
    "--bundle",
    "--format=esm",
    "--jsx=automatic",
    "--platform=browser",
    "--outfile=src/ui/dist/app.js",
    "--loader:.css=text",
  ],
  stdin: "null",
  stdout: "inherit",
  stderr: "inherit",
}).output();

if (!result.success) {
  Deno.exit(result.code);
}

await Deno.copyFile("src/ui/dashboard/styles.css", "src/ui/dist/styles.css");
