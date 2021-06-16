import { procedure } from "../src/procedure";

it("resolves when a validation is successful", async () => {
  await expect(
    procedure("test")
      .validate("test", (t) => t === true)
      .exec({ test: true })
  ).resolves.toBeUndefined();
});

it("rejects when a validation is unsuccessful", async () => {
  const isTestValid = (t) => t === false;
  await expect(
    procedure("test").validate("test", isTestValid).exec({ test: true })
  ).rejects.toMatchInlineSnapshot(`
          [ProcedureError: Unhandled Internal Exception

            12 |   const isTestValid = (t) => t === false;
            13 |   await expect(
          > 14 |     procedure("test").validate("test", isTestValid).exec({ test: true })
               |                       ^ test is invalid according to isTestValid
            15 |   ).rejects.toMatchInlineSnapshot(\`
            16 |           [ProcedureError: Unhandled Internal Exception
            17 |

          tests/validate.test.ts:14:23

          ]
        `);
});
