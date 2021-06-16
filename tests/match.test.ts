import { procedure } from "../src/procedure";

const fooHasBar = ({ foo }: any) => foo === "bar";
const fooHasNoBar = ({ foo }: any) => foo !== "bar";

it("matches on simple case", async () => {
  const testPassed = jest.fn();
  await procedure("match test")
    .match([[fooHasBar, testPassed]])
    .exec({ foo: "bar" });
  expect(testPassed).toBeCalled();
});

it("matches on multiple cases", async () => {
  const testPassed = jest.fn();
  const testFailed = jest.fn();
  await procedure("match test")
    .match([
      [fooHasNoBar, testFailed],
      [fooHasBar, testPassed],
    ])
    .exec({ foo: "bar" });
  expect(testPassed).toBeCalled();
  expect(testFailed).not.toBeCalled();
});

it("matches on first case without calling others", async () => {
  const testPassed = jest.fn();
  const testFailed = jest.fn();
  await procedure("match test")
    .match(
      [
        [fooHasBar, testPassed],
        [fooHasNoBar, testFailed],
      ],
      testFailed
    )
    .exec({ foo: "bar" });
  expect(testPassed).toBeCalled();
  expect(testFailed).not.toBeCalled();
});

it("uses fallback if one supplied and no other matches", async () => {
  const testPassed = jest.fn();
  const testFailed = jest.fn();
  await procedure("match test")
    .match(
      [
        [fooHasNoBar, testFailed],
        [fooHasNoBar, testFailed],
      ],
      testPassed
    )
    .exec({ foo: "bar" });
  expect(testPassed).toBeCalled();
  expect(testFailed).not.toBeCalled();
});

it("errors if no case matches without fallback", async () => {
  const testFailed = jest.fn();
  await expect(
    procedure("match test")
      .match([
        [fooHasNoBar, testFailed],
        [fooHasNoBar, testFailed],
      ])
      .exec({ foo: "bar" })
  ).rejects.toMatchInlineSnapshot(`
          [ProcedureError: Unhandled Internal Exception

            61 |   await expect(
            62 |     procedure("match test")
          > 63 |       .match([
               |        ^ Match statement unhandled, add a fallback
            64 |         [fooHasNoBar, testFailed],
            65 |         [fooHasNoBar, testFailed],
            66 |       ])

          tests/match.test.ts:63:8

          ]
        `);
  expect(testFailed).not.toBeCalled();
});
