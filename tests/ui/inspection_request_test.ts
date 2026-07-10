import { assert, assertEquals } from "@std/assert";
import { nextInspectionRequest } from "../../src/ui/dashboard/inspection_request.ts";

Deno.test("nextInspectionRequest assigns a new action identity to repeated equal targets", () => {
  const target = { metricName: "http.server.requests" };

  const first = nextInspectionRequest(undefined, target);
  const second = nextInspectionRequest(first, target);

  assertEquals(first, { actionId: 1, target });
  assertEquals(second, { actionId: 2, target });
  assert(first !== second);
});
