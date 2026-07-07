const malformedFixture = new TextEncoder().encode("not-a-protobuf");

await Deno.mkdir("fixtures/otlp", { recursive: true });
await Deno.writeFile("fixtures/otlp/malformed-protobuf.bin", malformedFixture);

console.log("Wrote fixtures/otlp/malformed-protobuf.bin");
