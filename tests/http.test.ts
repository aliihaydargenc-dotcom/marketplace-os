import { it, expect } from "vitest";
import { sameOrigin } from "../src/server/http";
it("accepts browser Origin matching Host even when Next reconstructs an internal hostname", () => {
  expect(() =>
    sameOrigin(
      new Request("http://localhost:3100/api/session", {
        headers: { origin: "http://127.0.0.1:3100", host: "127.0.0.1:3100" },
      }),
    ),
  ).not.toThrow();
});
it("rejects missing, cross-host, cross-port and spoofed forwarded origins", () => {
  for (const headers of [
    { host: "app.example" },
    { host: "app.example", origin: "https://evil.example" },
    { host: "app.example", origin: "https://app.example:444" },
    {
      host: "app.example",
      origin: "https://evil.example",
      "x-forwarded-host": "evil.example",
    },
  ])
    expect(() =>
      sameOrigin(
        new Request("https://app.example/api/session", {
          headers: headers as Record<string, string>,
        }),
      ),
    ).toThrow("Geçersiz");
});
