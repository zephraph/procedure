import StackTracey from "stacktracey";
import { matchOn } from "ts-union-tools";
import { createError, createMatchError, ERROR } from "./error";
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
import { last, to, style } from "./utils";
import { bold } from "chalk";
import { Context } from "./context";

const hasErrorHandler = (op: Operation) => !!op.onError;

const handleError = async (op: Operation, err: Error, context: Context) => {
  if (!op.onError) return err;
  const [error, result] = await to(op.onError(err, context));
  if (error) return error;
  if (result) {
    Object.assign(context, result);
  }
};

const validate: OperationExecutor<Validate> = async (op, context) => {
  const [err, result] = await to(Promise.resolve(op.run(context[op.argKey])));
  if (err) return await handleError(op, err, context);
  if (!result)
    throw createError(
      op.stackSource,
      `${op.argKey} is invalid ${
        op.run.name ? `according to ${style(op.run.name, bold)}` : ""
      }`,
      ERROR.INVALID(op.argKey)
    );
};

const update: OperationExecutor<Update> = async (op, context) => {
  try {
    const [err, result] = await to(
      Promise.resolve(op.run(context[op.argKey], context))
    );
    if (err) return await handleError(op, err, context);
    context[op.argKey] = result;
  } catch (err) {
    return await handleError(op, err, context);
  }
};

const load: OperationExecutor<Load> = async (op, context) => {
  const [err, newContext] = await to(Promise.resolve(op.run(context)));
  if (err && hasErrorHandler(op)) {
    return await handleError(op, err, context);
  } else if (err) {
    const { name } = op.run;
    let trace = new StackTracey(err);
    const index = trace.items.findIndex(
      (item) => item.calleeShort.split(" ")[0] === name
    );
    if (index > 0) {
      trace = trace.slice(0, index + 1);
    }
    throw createError(op.stackSource, err, "oops", trace);
  } else {
    Object.assign(context, newContext);
  }
};

const match: OperationExecutor<Match> = async (op, context) => {
  statementLoop: for (let [
    statementNum,
    statement,
  ] of op.statements.entries()) {
    const conditions = statement.slice(0, -1) as MatchCondition<any>[];
    const action = last(statement) as MatchAction<any>;
    for (let [index, condition] of conditions.entries()) {
      let [err, result] = await to(condition(context));
      if (err) {
        const temp = await handleError(op, err, context);
        if (temp instanceof Error) {
          const [message, ...details] = temp.toString().split("\n");
          const stack = details.join("\n") || temp.stack || "";
          throw createMatchError(
            { type: "statement", index, pos: statementNum },
            op.stackSource,
            op.procedure,
            message.trim().replace(/\d+ \|/, ""),
            ERROR.MATCH_CHECK_ERR(condition.name),
            stack.trim()
          );
        }
        return temp;
      }
      if (!result) continue statementLoop;
    }
    let [err, result] = await to(
      action instanceof Procedure ? action.exec(context) : action(context)
    );
    if (err) {
      const temp = await handleError(op, err, context);
      if (temp instanceof Error) {
        const [message, ...details] = temp.toString().split("\n");
        const stack = details.join("\n") || temp.stack || "";
        throw createMatchError(
          { type: "statement", index: statement.length - 1, pos: statementNum },
          op.stackSource,
          op.procedure,
          message.trim().replace(/\d+ \|/, ""),
          ERROR.MATCH_CHECK_ERR(action.name),
          stack.trim()
        );
      }
      result = temp;
    }
    if (result) {
      Object.assign(context, result);
    }
    return;
  }
  if (op.otherwise) {
    const [err, result] = await to(
      op.otherwise instanceof Procedure
        ? op.otherwise.exec(context)
        : op.otherwise(context)
    );
    if (err) return await handleError(op, err, context);
    if (result) {
      Object.assign(context, result);
    }
  } else {
    throw createError(
      op.stackSource,
      "Match statement unhandled, add a fallback",
      ERROR.NO_MATCH
    );
  }
};

const doEx: OperationExecutor<Do> = async (op, context) => {
  try {
    const [err] = await to(
      op.run instanceof Procedure ? op.run.exec(context) : op.run(context)
    );
    if (err) return await handleError(op, err, context);
  } catch (err) {
    return await handleError(op, err, context);
  }
};

export const execute = async (operations: Operation[], context: Context) => {
  for (let operation of operations) {
    let result = await matchOn("type", operation, {
      validate: (op) => validate(op, context),
      update: (op) => update(op, context),
      load: (op) => load(op, context),
      match: (op) => match(op, context),
      do: (op) => doEx(op, context),
      _: (op) => {
        throw createError(
          op.stackSource,
          "Invalid operation",
          ERROR.INVALID_OP
        );
      },
    });
    if (result !== undefined) {
      throw createError(operation.stackSource, result, ERROR.UNKNOWN_ERR);
    }
  }
};

type OperationExecutor<O extends Operation> = (
  op: O,
  context: Context
) => Promise<void | string | Error>;
