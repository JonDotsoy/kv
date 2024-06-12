import { test, mock, expect } from "bun:test";
import { SortedList } from "./sorted-list";

test("should create a SortedList from an array using the static from method", async () => {
  SortedList.from([1, 2, 3]);
});

test("should create a SortedList from an array using the constructor", async () => {
  new SortedList([1, 2, 3]);
});

test("should add an element to an empty SortedList", async () => {
  const list = new SortedList();

  list.add(1);
});

test("should add elements in the correct sorted order", async () => {
  const list = new SortedList();

  list.add(3);
  list.add(1);
  list.add(2);

  expect(Array.from(list)).toEqual([1, 2, 3]);
});

test("should handle duplicate elements and maintain sorted order", async () => {
  const list = new SortedList();

  list.add(2);
  list.add(2);
  list.add(1);
  list.add(3);

  expect(Array.from(list)).toEqual([1, 2, 2, 3]);
});
