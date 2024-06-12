import { test, expect } from "bun:test";
import { StringMatchPattern } from "./string-match-pattern";

test("should match string starting with 'f' and containing any characters after", () => {
  expect(new StringMatchPattern("f*").test("foo")).toBeTrue();
});

test("should match string starting with 'f' and containing any characters after", () => {
  expect(new StringMatchPattern("f*").test("feelsgood")).toBeTrue();
});

test("should match string starting with 'f' and containing any characters after", () => {
  expect(new StringMatchPattern("f*").test("foobar")).toBeTrue();
});
