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

const hasErrorHandler = (op: Operation) => !!op.onError;

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
        op.run.name ? `according to ${style(op.run.name, bold)}` : ""
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
  const [err, context] = await to(Promise.resolve(op.run(op.context)));
  if (err && hasErrorHandler(op)) {
    return await handleError(op, err);
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
    Object.assign(op.context, context);
  }
};

const match: OperationExecutor<Match> = async (op) => {
  statementLoop: for (let [
    statementNum,
    statement,
  ] of op.statements.entries()) {
    const conditions = statement.slice(0, -1) as MatchCondition<any>[];
    const action = last(statement) as MatchAction<any>;
    for (let [index, condition] of conditions.entries()) {
      let [err, result] = await to(condition(op.context));
      if (err) {
        const temp = await handleError(op, err);
        if (temp instanceof Error) {
          throw createMatchError(
            { type: "statement", index, pos: statementNum },
            op.stackSource,
            op.procedure,
            "boop",
            "boop"
          );
        }
        return temp;
      }
      if (!result) continue statementLoop;
    }
    let [err, result] = await to(
      action instanceof Procedure ? action.exec(op.context) : action(op.context)
    );
    if (err) {
      const temp = await handleError(op, err);
      if (temp instanceof Error) {
        const [message, ...details] = temp.toString().split("\n");
        throw createMatchError(
          { type: "statement", index: statement.length - 1, pos: statementNum },
          op.stackSource,
          op.procedure,
          message.trim().replace(/\d+ \|/, ""),
          ERROR.MATCH_CHECK_ERR(action.name),
          details.join("\n")
        );
      }
      result = temp;
    }
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
      throw createError(operation.stackSource, result, ERROR.UNKNOWN_ERR);
    }
  }
};

type OperationExecutor<O extends Operation> = (
  op: O
) => Promise<void | string | Error>;
