import { procedure } from "../src/procedure";

it("resolves when a validation is successful", async () => {
  await expect(
    procedure("test", { test: true })
      .validate("test", (t) => t === true)
      .exec()
  ).resolves.toBeUndefined();
});

it("rejects when a validation is unsuccessful", async () => {
  const isTestValid = (t) => t === false;
  await expect(
    procedure("test", { test: true }).validate("test", isTestValid).exec()
  ).rejects.toMatchInlineSnapshot(`
          [[1m[31mProcedureError[39m[22m: Unhandled Internal Exception

            12 |   const isTestValid = (t) => t === false;
            13 |   await expect(
          > 14 |     procedure("test", { test: true }).validate("test", isTestValid).exec()
               |                                       ^ test is invalid according to [1misTestValid[22m
            15 |   ).rejects.toMatchInlineSnapshot(\`
            16 |           [[1m[31mProcedureError[39m[22m: Unhandled Internal Exception
            17 |

          [2mtests/validate.test.ts:14:39[22m

          ]
        `);
});
