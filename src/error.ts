import { codeFrameColumns } from "@babel/code-frame";
import StackTracey from "stacktracey";
import { yellow, bold } from "chalk"
import { Context } from "./context";

export const ERROR = {
  INVALID_OP: "invalid-operation",
  UNKNOWN_ERR: "unknown-error",
  NO_MATCH: "unmatched-value",
  INVALID: <C extends Context>(key: keyof C) => `error-validate-${key}`
} as const

class ProcedureError extends Error {
  constructor(message: string, public readonly id: string) {
    super(message)
    this.name = "ProcedureError"
  }
}

export const createError = (trace: StackTracey, message: string, code: string) => {
  const stack = trace.withSource(trace.items[0]);
  const lines = stack.sourceFile?.text;
  const header = `Unhandled Internal Exception\n\n`
  const footer = `\n\nCode: ${yellow(bold(code))}`
  return new ProcedureError(header + codeFrameColumns(
    lines!,
    {
      start: {
        line: stack.line!,
        column: stack.column,
      },
    },
    {
      message,
      highlightCode: process.env.NODE_ENV === "test" ? false : true,
    }
  ) + footer, code);
};
