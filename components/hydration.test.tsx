import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import Hydration from "./hydration";

test("server rendering works without browser storage", () => {
  expect(renderToString(<Hydration />)).toBe("");
});
