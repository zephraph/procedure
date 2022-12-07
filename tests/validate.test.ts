import { procedure } from "../src/procedure";

it("resolves when a validation is successful", async () => {
  await expect(
    procedure("test", { test: true })
      .validate("test", (t) => t === true)
      .exec()
  ).resolves.toStrictEqual({ test: true });
});

it("rejects when a validation is unsuccessful", async () => {
  const isTestValid = (t) => t === false;
  await expect(
    procedure("test", { test: true }).validate("test", isTestValid).exec()
  ).rejects.toMatchInlineSnapshot(`
          [ProcedureError: Unhandled Internal Exception

            12 |   const isTestValid = (t) => t === false;
            13 |   await expect(
          > 14 |     procedure("test", { test: true }).validate("test", isTestValid).exec()
               |                                       ^ test is invalid according to isTestValid
            15 |   ).rejects.toMatchInlineSnapshot(\`
            16 |           [ProcedureError: Unhandled Internal Exception
            17 |

          tests/validate.test.ts:14:39

          ]
        `);
});
