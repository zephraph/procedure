import { procedure } from "../src/procedure";

it("should handle errors from do", async () => {
  const context = {};
  const err = "err";
  const orFn = jest.fn().mockImplementation(() => {});
  await procedure("do test")
    .do(() => {
      throw err;
    })
    .or(orFn)
    .exec(context);
  expect(orFn).toBeCalledWith(err, context);
});
