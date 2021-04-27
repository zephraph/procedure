import { matchOn } from "ts-union-tools";
import { createError } from "./error";
import { Validate, Load, Operation, Match, MatchStatement, MatchCondition, MatchAction, Do, Update } from "./operations";
import { last, to } from "./utils";

const validate: OperationExecutor<Validate> = async (op) => {
  const [err, result] = await to(Promise.resolve(op.run(op.context[op.argKey])));
  if (err) return err;
  if (!result) return `${op.argKey} is invalid ${op.run.name ? `according to ${op.run.name}` : ""}`;
};

const update: OperationExecutor<Update> = async (op) => {
  const [err, result] = await to(Promise.resolve(op.run(op.context[op.argKey], op.context)))
  if (err) return err;
  op.context[op.argKey] = result;
}

const load: OperationExecutor<Load> = async (op) => {
  const [err, context] = await to(Promise.resolve(op.run(op.context)))
  if (err) return err;
  Object.assign(op.context, context)
}

const match: OperationExecutor<Match> = async (op) => {
  statementLoop: 
  for(let statement of op.statements) {
    const conditions = statement.slice(0, -1) as MatchCondition<any>[]
    const action = last(statement) as MatchAction<any>
    for(let condition of conditions) {
      const result = await condition(op.context)
      if (!result) continue statementLoop;
    }
    const result = await action(op.context);
    if (result) {
      Object.assign(op.context, result)
    }
    return;
  }
  if (op.otherwise) {
    await op.otherwise(op.context)
  } else {
    throw createError(op.stackSource, "Match statement unhandled, add a fallback")
  }
}

const doEx: OperationExecutor<Do> = async (op) => {
  const [err] = await to(Promise.resolve(op.run(op.context)))
  if (err) return err;
}

export const execute = async (operations: Operation[]) => {
  for (let operation of operations) {
    let result = await matchOn("type", operation, {
      validate: (op) => validate(op),
      update: (op) => update(op),
      load: op => load(op),
      match: op => match(op),
      'do': op => doEx(op),
      _: (op) => {
        throw createError(op.stackSource, "Invalid operation")
      },
    });
    if (result !== undefined) {
      throw createError(operation.stackSource, result as string)
    }
  }
};

type OperationExecutor<O extends Operation> = (
  op: O
) => Promise<void | string | Error>;
