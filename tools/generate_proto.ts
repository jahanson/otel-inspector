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
const pluginEnvPermissions = [
  "DEBUG",
  "NODE_INSPECTOR_IPC",
  "NODE_ENV",
  "TS_ETW_MODULE_PATH",
  "TSC_NONPOLLING_WATCHER",
  "TSC_WATCHDIRECTORY",
  "TSC_WATCHFILE",
  "TSC_WATCH_POLLINGCHUNKSIZE_HIGH",
  "TSC_WATCH_POLLINGCHUNKSIZE_LOW",
  "TSC_WATCH_POLLINGCHUNKSIZE_MEDIUM",
  "TSC_WATCH_POLLINGINTERVAL_HIGH",
  "TSC_WATCH_POLLINGINTERVAL_LOW",
  "TSC_WATCH_POLLINGINTERVAL_MEDIUM",
  "TSC_WATCH_UNCHANGEDPOLLTHRESHOLDS_HIGH",
  "TSC_WATCH_UNCHANGEDPOLLTHRESHOLDS_LOW",
  "TSC_WATCH_UNCHANGEDPOLLTHRESHOLDS_MEDIUM",
  "VSCODE_INSPECTOR_OPTIONS",
].join(",");
const pluginScript = isWindows
  ? `@echo off\r\ndeno run --allow-env=${pluginEnvPermissions} --allow-read npm:@protobuf-ts/plugin@2.11.1/protoc-gen-ts %*\r\n`
  : `#!/usr/bin/env sh\nexec deno run --allow-env=${pluginEnvPermissions} --allow-read npm:@protobuf-ts/plugin@2.11.1/protoc-gen-ts "$@"\n`;
await Deno.writeTextFile(pluginPath, pluginScript);
if (!isWindows) {
  await Deno.chmod(pluginPath, 0o755);
}

try {
  const pathSeparator = isWindows ? ";" : ":";
  const protocPath = await findProtocPath();
  const command = new Deno.Command(protocPath, {
    args: [
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

async function findProtocPath(): Promise<string> {
  const pathCommand = isWindows ? "where.exe" : "which";
  const pathLookup = await new Deno.Command(pathCommand, {
    args: ["protoc"],
    stdout: "piped",
    stderr: "null",
  }).output();
  if (pathLookup.success) {
    const [firstPath] = new TextDecoder().decode(pathLookup.stdout).trim().split(/\r?\n/);
    if (firstPath) {
      return firstPath;
    }
  }

  const localAppData = Deno.env.get("LOCALAPPDATA");
  const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE");
  const candidateRoots = [
    localAppData ? `${localAppData}/deno/npm/registry.npmjs.org/@protobuf-ts/protoc/2.11.1/installed` : undefined,
    home ? `${home}/.cache/deno/npm/registry.npmjs.org/@protobuf-ts/protoc/2.11.1/installed` : undefined,
  ].filter((candidate): candidate is string => candidate !== undefined);

  for (const root of candidateRoots) {
    try {
      for await (const entry of Deno.readDir(root)) {
        if (!entry.isDirectory || !entry.name.startsWith("protoc-")) {
          continue;
        }

        const executable = isWindows ? "protoc.exe" : "protoc";
        const candidate = `${root}/${entry.name}/bin/${executable}`;
        try {
          const info = await Deno.stat(candidate);
          if (info.isFile) {
            return candidate;
          }
        } catch (error) {
          if (!(error instanceof Deno.errors.NotFound)) {
            throw error;
          }
        }
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }
  }

  throw new Error(
    "protoc was not found on PATH or in the @protobuf-ts/protoc cache. Run `deno run -A npm:@protobuf-ts/protoc@2.11.1 --version` once to install it, then rerun `deno task proto:gen`.",
  );
}
