const isPromiseLike = <I extends unknown>(item: I | Promise<I>) => {
  if (typeof item === "object") {
    return "then" in (item as object);
  }
};

export const to = <T, U = Error>(p: Promise<T> | T) => {
  return Promise.resolve(p).then((v) => [null, v]).catch((e) => [e, undefined]) as
    | Promise<[null, T]>
    | Promise<[U, undefined]>;
};

export const last = <T extends unknown>(a: Array<T>) => a[a.length - 1];
