/**
 * A generic class that represents a sorted list data structure.
 * Elements are stored in sorted order, and new elements are automatically
 * inserted in the correct position to maintain the sorted order.
 *
 * @template T - The type of elements in the list.
 *
 * @sample
 * const list = new SortedList([3, 1, 4, 1, 5, 9, 2, 6, 5]);
 *
 * // Iterate over the sorted list
 * for (const num of list) {
 *   console.log(num); // Output: 1, 1, 2, 3, 4, 5, 5, 6, 9
 * }
 *
 * list.add(7); // Add a new element
 *
 * // Iterate again
 * for (const num of list) {
 *   console.log(num); // Output: 1, 1, 2, 3, 4, 5, 5, 6, 7, 9
 * }
 */
export class SortedList<T> {
  #childs: T[] = [];

  /**
   * Creates a new SortedList instance.
   *
   * @param iterable - An optional iterable object containing the initial elements
   * of the list. If provided, the elements will be sorted and added to the list.
   */
  constructor(iterable: Iterable<T> = []) {
    for (const elm of iterable) {
      this.add(elm);
    }
  }

  /**
   * Adds a new element to the list, maintaining the sorted order.
   *
   * @param elm - The element to be added to the list.
   */
  add(elm: T) {
    const findIndexToInsert = this.#childs.findIndex((state) => elm <= state);
    if (findIndexToInsert === -1) {
      this.#childs.push(elm);
      return;
    }
    this.#childs.splice(findIndexToInsert, 0, elm);
  }

  /**
   * Returns an iterator for the sorted list.
   *
   * @returns An iterator over the elements in the sorted list.
   */
  [Symbol.iterator]() {
    return this.#childs[Symbol.iterator]();
  }

  /**
   * Creates a new SortedList instance from an iterable object.
   *
   * @param iterable - The iterable object containing the initial elements of the list.
   * @returns A new SortedList instance containing the sorted elements from the iterable.
   */
  static from = <T>(iterable: Iterable<T>) => {
    return new SortedList(iterable);
  };
}
