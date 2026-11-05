import { describe, expect, it } from "vitest";
import { donateUrl } from "./donate";

describe("donateUrl", () => {
  it("builds a one-off USD PayPal link with an escaped account and the chosen amount", () => {
    const url = new URL(donateUrl("team+x@example.com", 5));
    expect(url.origin + url.pathname).toBe("https://www.paypal.com/donate/");
    expect(url.searchParams.get("business")).toBe("team+x@example.com");
    expect(url.searchParams.get("amount")).toBe("5");
    expect(url.searchParams.get("currency_code")).toBe("USD");
    expect(url.searchParams.get("no_recurring")).toBe("1");
  });
});
