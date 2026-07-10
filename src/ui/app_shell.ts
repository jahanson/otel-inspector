export function buildAppShell(initialProjection: unknown, actionToken = ""): string {
  const projectionJson = serializeForInlineScript(initialProjection);
  const actionTokenJson = serializeForInlineScript(actionToken);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>OTEL Inspector</title>
    <link rel="stylesheet" href="/assets/styles.css">
  </head>
  <body>
    <div id="root"></div>
    <script>globalThis.__OTEL_INITIAL_PROJECTION__ = ${projectionJson};</script>
    <script>globalThis.__OTEL_DASHBOARD_ACTION_TOKEN__ = ${actionTokenJson};</script>
    <script type="module" src="/assets/app.js"></script>
  </body>
</html>`;
}

function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}
