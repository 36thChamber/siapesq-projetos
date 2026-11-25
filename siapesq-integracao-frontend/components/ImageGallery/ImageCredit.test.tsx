import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import ImageCredit from "./ImageCredit";

it("shows the author, media license and source without accepting executable links", () => {
  render(<ImageCredit image={{ url: "https://example.com/photo", creator: "Fotógrafa", rightsHolder: "Fotógrafa",
    license: "https://creativecommons.org/licenses/by-sa/4.0/", occurrenceUrl: "javascript:alert(1)" }} />);
  expect(screen.getByTestId("image-credit").textContent).toContain("Fotógrafa · CC BY-SA 4.0");
  expect(screen.getAllByRole("link")).toHaveLength(1);
  expect(screen.getByRole("link").getAttribute("href")).toBe("https://creativecommons.org/licenses/by-sa/4.0/");
});
