import { expect, it } from "vitest";
import { authRequestJson, authResponseJson } from "./auth-json";

it("rejects oversized authentication requests before parsing credentials", async () => {
  const request = new Request("http://localhost/login", { method: "POST", body: "x".repeat(17000) });
  await expect(authRequestJson(request, new AbortController().signal)).rejects.toMatchObject({ status: 413 });
});
it("bounds upstream authentication metadata and rejects invalid input JSON", async () => {
  await expect(authResponseJson(new Response("x".repeat(70000)), new AbortController().signal)).rejects.toMatchObject({ status: 502 });
  await expect(authRequestJson(new Request("http://localhost/login", { method: "POST", body: "{" }), new AbortController().signal)).rejects.toMatchObject({ status: 400 });
});
