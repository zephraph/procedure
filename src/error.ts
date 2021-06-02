import { codeFrameColumns } from "@babel/code-frame";
import StackTracey from "stacktracey";
import { yellow, bold, dim, red } from "chalk";
import { Context } from "./context";
import { Operation } from "./operations";
import { parseMatch } from "./parsers";
import { style } from "./utils";
import asTable from "as-table";

const isNumber = (n: any) => typeof n === "number";

const formatFilePosition = ({
  line,
  column,
}: {
  line?: number;
  column?: number;
}) =>
  ((isNumber(line) && `:${line}`) || "") +
  ((isNumber(line) && isNumber(column) && `:${column}`) || "");

export const ERROR = {
  INVALID_OP: "invalid-operation",
  UNKNOWN_ERR: "unknown-error",
  NO_MATCH: "unmatched-value",
  RUNTIME_ERR: "runtime-error",
  INVALID: <C extends Context>(key: keyof C) => `validate-error:${key}`,
  MATCH_CHECK_ERR: (check: string) => `match-check-error:${check}`,
} as const;

class ProcedureError extends Error {
  constructor(message: string, public readonly id: string) {
    super(message);
    this.name = style("ProcedureError", bold, red);
  }
  toString() {
    return this.message;
  }
}

export const createError = (
  trace: StackTracey,
  err: string | Error,
  code: string,
  errTrace?: StackTracey
) => {
  const sourceTrace = trace.withSource(trace.items[0]);
  const lines = sourceTrace.sourceFile?.text;
  const header = `Unhandled Internal Exception\n\n`;
  let footer = `\n\n${
    (errTrace &&
      "which...\n" +
        asTable(
          errTrace.items
            .map((item, index) =>
              index === 0
                ? [
                    style(
                      `  ${style("failed:", red)} ${item.calleeShort}`,
                      bold
                    ),
                    style(item.fileShort + formatFilePosition(item), bold),
                  ]
                : [
                    `  called: ${item.calleeShort}`,
                    item.fileShort + formatFilePosition(item),
                  ]
            )
            .reverse()
        ) +
        `\n${" ".repeat(10)}${style(
          "^".repeat(errTrace.items[0].calleeShort.split(" ")[0].length),
          bold,
          red
        )}️ ${style("this threw the exception", bold, yellow)}`) ||
    ""
  }`;

  const message = err instanceof Error ? err.message.split("\n")[0] : err;

  const line = sourceTrace.line!;
  const column = sourceTrace.column!;

  return new ProcedureError(
    header +
      codeFrameColumns(
        lines!,
        {
          start: {
            line,
            column,
          },
        },
        {
          message,
          highlightCode: process.env.NODE_ENV === "test" ? false : true,
        }
      ) +
      `\n\n${style(
        `${sourceTrace.fileRelative}${formatFilePosition(sourceTrace)}`,
        dim
      )}` +
      footer,
    code
  );
};

export const createMatchError = (
  meta:
    | { type: "statement"; index: number; pos: number }
    | { type: "fallback" },
  trace: StackTracey,
  procedure: string,
  message: string,
  code: string,
  details?: string
) => {
  const stack = trace.withSource(trace.items[0]);
  const text = stack.sourceFile?.text!;
  // const header = `Unhandled Internal Exception\n\n`;
  const footer = `${style("This error was caused by", yellow)} 👇\n\n`;

  let column = stack.column!;
  let line = stack.line!;
  let length = 0;
  const startingline = line;
  const result = parseMatch(stack.sourceFile!.lines, startingline);

  if (meta.type === "statement") {
    const failedAt = result.statements[meta.pos][meta.index];
    line = failedAt.lineNumber;
    column = failedAt.startAt + 1;
    length = failedAt.value.length;
  }

  const header = `the ${bold(
    procedure
  )} procedure encountered an uncaught exception\n\n`;

  return new ProcedureError(
    header +
      codeFrameColumns(
        text,
        {
          start: {
            line,
            column,
          },
          end: {
            line,
            column: column + length,
          },
        },
        {
          message,
          highlightCode: process.env.NODE_ENV === "test" ? false : true,
        }
      ) +
      `\n\n${style(`${stack.fileRelative}:${line}:${column}`, dim)}\n\n` +
      footer +
      // dim("\n───────────────────────────────────────────────") +
      details,
    code
  );
};
