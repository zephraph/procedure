import { procedure } from '../src/procedure'

it("should run something on do", async () => {
  let context = { foo: 'bar' }
  let doFn = jest.fn();
  await procedure('test', context)
    .do(doFn)
    .exec()
  expect(doFn).toBeCalledWith(context)
})