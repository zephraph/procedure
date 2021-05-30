import { MatchBody, parseMatch } from "../src/parsers";
import endent from "endent";

describe("parseMatch", () => {
  it("parses a simple match expression", () => {
    const match = endent`
      .match([
        [ifSomething, doSomething]
      ])
    `.split("\n");

    expect(parseMatch(match, 0)).toEqual<MatchBody>({
      statements: [
        [
          { lineNumber: 1, startAt: 3, value: "ifSomething" },
          { lineNumber: 1, startAt: 16, value: "doSomething" },
        ],
      ],
    });
  });

  it("parses a complex match expression with a fallback", () => {
    const match = endent`
      .match([
        [ifSomething, doSomething],
        [ifThis, thenThat],
      ], fallback)
    `.split("\n");

    expect(parseMatch(match, 0)).toEqual<MatchBody>({
      statements: [
        [
          { lineNumber: 1, startAt: 3, value: "ifSomething" },
          { lineNumber: 1, startAt: 16, value: "doSomething" },
        ],
        [
          { lineNumber: 2, startAt: 3, value: "ifThis" },
          { lineNumber: 2, startAt: 11, value: "thenThat" },
        ],
      ],
      fallback: {
        lineNumber: 3,
        startAt: 3,
        value: "fallback",
      },
    });
  });
});
