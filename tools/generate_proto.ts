const protoRoot = "tools/proto";
const outputDir = "src/backend/otel/proto";
const protoFiles = [
  "opentelemetry/proto/common/v1/common.proto",
  "opentelemetry/proto/resource/v1/resource.proto",
  "opentelemetry/proto/metrics/v1/metrics.proto",
  "opentelemetry/proto/collector/metrics/v1/metrics_service.proto",
];

await Deno.remove(outputDir, { recursive: true }).catch((error) => {
  if (!(error instanceof Deno.errors.NotFound)) {
    throw error;
  }
});
await Deno.mkdir(outputDir, { recursive: true });

const pluginDir = await Deno.makeTempDir({ prefix: "otel-inspector-protoc-" });
const isWindows = Deno.build.os === "windows";
const pluginPath = `${pluginDir}/${isWindows ? "protoc-gen-ts.cmd" : "protoc-gen-ts"}`;
const pluginScript = isWindows
  ? "@echo off\r\ndeno run -A npm:@protobuf-ts/plugin@2.11.1/protoc-gen-ts %*\r\n"
  : '#!/usr/bin/env sh\nexec deno run -A npm:@protobuf-ts/plugin@2.11.1/protoc-gen-ts "$@"\n';
await Deno.writeTextFile(pluginPath, pluginScript);
if (!isWindows) {
  await Deno.chmod(pluginPath, 0o755);
}

try {
  const pathSeparator = isWindows ? ";" : ":";
  const command = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "-A",
      "npm:@protobuf-ts/protoc@2.11.1",
      `--proto_path=${protoRoot}`,
      `--ts_out=${outputDir}`,
      "--ts_opt=force_disable_services",
      ...protoFiles.map((file) => `${protoRoot}/${file}`),
    ],
    env: {
      PATH: `${pluginDir}${pathSeparator}${Deno.env.get("PATH") ?? ""}`,
    },
    stdout: "inherit",
    stderr: "inherit",
  });

  const status = await command.output();
  if (!status.success) {
    throw new Error(`protoc failed with exit code ${status.code}`);
  }

  for await (const entry of walkGeneratedFiles(outputDir)) {
    const source = await Deno.readTextFile(entry);
    const withDenoImports = source
      .replaceAll(/from "((?:\.\.?\/)[^"]+)(?<!\.ts)";/g, 'from "$1.ts";')
      .replaceAll(/^[ ]{4}(create|internalBinaryRead|internalBinaryWrite)\(/gm, "    override $1(");
    if (withDenoImports !== source) {
      await Deno.writeTextFile(entry, withDenoImports);
    }
  }

  const fmt = new Deno.Command(Deno.execPath(), {
    args: ["fmt", outputDir],
    stdout: "inherit",
    stderr: "inherit",
  });
  const fmtStatus = await fmt.output();
  if (!fmtStatus.success) {
    throw new Error(`deno fmt failed with exit code ${fmtStatus.code}`);
  }
} finally {
  await Deno.remove(pluginDir, { recursive: true });
}

console.log(`Generated OTLP protobuf bindings in ${outputDir}`);

async function* walkGeneratedFiles(root: string): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(root)) {
    const path = `${root}/${entry.name}`;
    if (entry.isDirectory) {
      yield* walkGeneratedFiles(path);
    } else if (entry.isFile && path.endsWith(".ts")) {
      yield path;
    }
  }
}
