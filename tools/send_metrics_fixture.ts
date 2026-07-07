import { RECEIVER_CONTRACT, receiverEndpoint } from "../src/backend/contracts.ts";

const fixturePath = "fixtures/otlp/malformed-protobuf.bin";
const payload = await Deno.readFile(fixturePath);

const response = await fetch(receiverEndpoint(RECEIVER_CONTRACT), {
  method: "POST",
  headers: {
    "content-type": RECEIVER_CONTRACT.contentType,
  },
  body: payload,
});

const body = await response.text();
console.log(`${response.status} ${body}`);
