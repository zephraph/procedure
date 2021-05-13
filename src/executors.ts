import { matchOn } from "ts-union-tools";
import { createError, ERROR } from "./error";
import {
  Validate,
  Load,
  Operation,
  Match,
  MatchCondition,
  MatchAction,
  Do,
  Update,
} from "./operations";
import { Procedure } from "./procedure";
import { last, to } from "./utils";

const handleError = async (op: Operation, err: Error) => {
  if (!op.onError) return err;
  const [error, result] = await to(op.onError(err, op.context));
  if (error) return error;
  if (result) {
    Object.assign(op.context, result);
  }
};

const validate: OperationExecutor<Validate> = async (op) => {
  const [err, result] = await to(
    Promise.resolve(op.run(op.context[op.argKey]))
  );
  if (err) return await handleError(op, err);
  if (!result)
    throw createError(
      op.stackSource,
      `${op.argKey} is invalid ${
        op.run.name ? `according to ${op.run.name}` : ""
      }`,
      ERROR.INVALID(op.argKey)
    );
};

const update: OperationExecutor<Update> = async (op) => {
  try {
    const [err, result] = await to(
      Promise.resolve(op.run(op.context[op.argKey], op.context))
    );
    if (err) return await handleError(op, err);
    op.context[op.argKey] = result;
  } catch (err) {
    return await handleError(op, err);
  }
};

const load: OperationExecutor<Load> = async (op) => {
  try {
    const [err, context] = await to(Promise.resolve(op.run(op.context)));
    if (err) return await handleError(op, err);
    Object.assign(op.context, context);
  } catch (err) {
    return await handleError(op, err);
  }
};

const match: OperationExecutor<Match> = async (op) => {
  statementLoop: for (let statement of op.statements) {
    const conditions = statement.slice(0, -1) as MatchCondition<any>[];
    const action = last(statement) as MatchAction<any>;
    for (let condition of conditions) {
      const [err, result] = await to(condition(op.context));
      if (err) return await handleError(op, err);
      if (!result) continue statementLoop;
    }
    const [err, result] = await to(
      action instanceof Procedure ? action.exec(op.context) : action(op.context)
    );
    if (err) return await handleError(op, err);
    if (result) {
      Object.assign(op.context, result);
    }
    return;
  }
  if (op.otherwise) {
    const [err, result] = await to(
      op.otherwise instanceof Procedure
        ? op.otherwise.exec(op.context)
        : op.otherwise(op.context)
    );
    if (err) return await handleError(op, err);
    if (result) {
      Object.assign(op.context, result);
    }
  } else {
    throw createError(
      op.stackSource,
      "Match statement unhandled, add a fallback",
      ERROR.NO_MATCH
    );
  }
};

const doEx: OperationExecutor<Do> = async (op) => {
  try {
    const [err] = await to(op.run(op.context));
    if (err) return await handleError(op, err);
  } catch (err) {
    return await handleError(op, err);
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
        throw createError(
          op.stackSource,
          "Invalid operation",
          ERROR.INVALID_OP
        );
      },
    });
    if (result !== undefined) {
      throw createError(
        operation.stackSource,
        result as string,
        ERROR.UNKNOWN_ERR
      );
    }
  }
};

type OperationExecutor<O extends Operation> = (
  op: O
) => Promise<void | string | Error>;
