const ESBUILD_VERSION = "0.25.8";

await Deno.mkdir("src/ui/dist", { recursive: true });

const command = new Deno.Command(esbuildBinary(), {
  args: [
    "src/ui/dashboard/main.tsx",
    "--bundle",
    "--format=esm",
    "--jsx=automatic",
    "--loader:.css=text",
    "--log-level=info",
    "--outfile=src/ui/dist/app.js",
    "--platform=browser",
  ],
  stderr: "inherit",
  stdout: "inherit",
});
const output = await command.output();
if (!output.success) {
  throw new Error(`esbuild exited with code ${output.code}.`);
}

await Deno.copyFile("src/ui/dashboard/styles.css", "src/ui/dist/styles.css");

function esbuildBinary(): string {
  const platform = esbuildPlatform();
  const executable = Deno.build.os === "windows" ? "esbuild.exe" : "bin/esbuild";
  return `node_modules/.deno/@esbuild+${platform}@${ESBUILD_VERSION}/node_modules/@esbuild/${platform}/${executable}`;
}

function esbuildPlatform(): string {
  const arch = Deno.build.arch === "x86_64" ? "x64" : Deno.build.arch;
  switch (Deno.build.os) {
    case "darwin":
      return `darwin-${arch}`;
    case "linux":
      return `linux-${arch}`;
    case "windows":
      return `win32-${arch}`;
    default:
      throw new Error(`Unsupported esbuild platform: ${Deno.build.os}/${Deno.build.arch}.`);
  }
}
