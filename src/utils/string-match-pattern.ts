/**
 * A class that provides pattern matching functionality for strings.
 * It allows you to create a pattern using wildcard characters and test
 * if a given string matches that pattern.
 *
 * @example
 * const pattern = new StringMatchPattern("f*");
 * pattern.test("foo"); // true
 * pattern.test("bar"); // false
 */
export class StringMatchPattern {
  patternExpre: RegExp;

  /**
   * Creates a new instance of the StringMatchPattern class.
   *
   * @param {string} pattern - The pattern to match against. The '*' character is used as a wildcard to match any sequence of characters.
   */
  constructor(readonly pattern: string) {
    this.patternExpre = StringMatchPattern.patternToRegExp(pattern);
  }

  /**
   * Tests if the given value matches the pattern.
   *
   * @param {string} value - The string to test against the pattern.
   * @returns {boolean} True if the value matches the pattern, false otherwise.
   */
  test(value: string) {
    return this.patternExpre.test(value);
  }

  /**
   * Converts a pattern string to a regular expression.
   *
   * @param {string} pattern - The pattern string to convert.
   * @returns {RegExp} The regular expression representing the pattern.
   * @private
   */
  private static patternToRegExp(pattern: string): RegExp {
    const newLocal = pattern.replace(/\W/g, (char) => {
      if (char === "*") return ".*";
      return `\\${char}`;
    });
    return new RegExp(`^${newLocal}$`);
  }
}
