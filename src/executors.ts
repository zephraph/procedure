import { matchOn } from "ts-union-tools";
import { Context } from "./context";
import { createError } from "./error";
import {
  Validate,
  Load,
  Operation,
  Match,
  MatchStatement,
  MatchCondition,
  MatchAction,
  Do,
  Update,
} from "./operations";
import { last, to } from "./utils";

const handleError = async (
  op: Operation,
  err: Error
) => {
  if (!op.onError) return err;
  const [error, result] = await to(op.onError(err, op.context))
  if (error) return error;
  if (result) {
    Object.assign(op.context, result)
  }
};

const validate: OperationExecutor<Validate> = async (op) => {
  try {
  const [err, result] = await to(
    Promise.resolve(op.run(op.context[op.argKey]))
  );
  if (err) return await handleError(op, err)
  if (!result)
    return `${op.argKey} is invalid ${
      op.run.name ? `according to ${op.run.name}` : ""
    }`;
  } catch (err) {
    return await handleError(op, err)
  }
};

const update: OperationExecutor<Update> = async (op) => {
  try {
    const [err, result] = await to(
      Promise.resolve(op.run(op.context[op.argKey], op.context))
    );
    if (err) return await handleError(op, err)
    op.context[op.argKey] = result;
  } catch (err) {
    return await handleError(op, err)
  }
};

const load: OperationExecutor<Load> = async (op) => {
  try {
    const [err, context] = await to(Promise.resolve(op.run(op.context)));
    if (err) return await handleError(op, err)
    Object.assign(op.context, context);
  } catch (err) {
    return await handleError(op, err)
  }
};

const match: OperationExecutor<Match> = async (op) => {
  statementLoop: for (let statement of op.statements) {
    const conditions = statement.slice(0, -1) as MatchCondition<any>[];
    const action = last(statement) as MatchAction<any>;
    for (let condition of conditions) {
      const [err, result] = await to(condition(op.context));
      if (err) return await handleError(op, err)
      if (!result) continue statementLoop;
    }
    const [err, result] = await to(action(op.context));
    if (err) return await handleError(op, err)
    if (result) {
      Object.assign(op.context, result);
    }
    return;
  }
  if (op.otherwise) {
    const [err, result] = await to(op.otherwise(op.context));
    if (err) return await handleError(op, err)
    if (result) {
      Object.assign(op.context, result);
    }
  } else {
    throw createError(
      op.stackSource,
      "Match statement unhandled, add a fallback"
    );
  }
};

const doEx: OperationExecutor<Do> = async (op) => {
  try {
    const [err] = await to(op.run(op.context));
    if (err) return await handleError(op, err)
  } catch (err) {
    return await handleError(op, err)
  }
};

export const execute = async (operations: Operation[]) => {
  for (let operation of operations) {
    let result = await matchOn("type", operation, {
      validate: (op) => validate(op),
      update: (op) => update(op),
      load: (op) => load(op),
      match: (op) => match(op),
      do: (op) => doEx(op),
      _: (op) => {
        throw createError(op.stackSource, "Invalid operation");
      },
    });
    if (result !== undefined) {
      throw createError(operation.stackSource, result as string);
    }
  }
};

type OperationExecutor<O extends Operation> = (
  op: O
) => Promise<void | string | Error>;
