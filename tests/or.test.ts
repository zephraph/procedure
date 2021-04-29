import { procedure } from '../src/procedure'

it("should handle errors from do", async () => {
  const context = {};
  const err = "err"
  const orFn = jest.fn().mockImplementation(() => {});
  await procedure('do test', context)
    .do(() => { throw err })
    .or(orFn)
    .exec()
  expect(orFn).toBeCalledWith(err, context)
})