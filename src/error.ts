import { codeFrameColumns } from "@babel/code-frame";
import StackTracey from "stacktracey";

export const createError = (trace: StackTracey, message: string) => {
  const stack = trace.withSource(trace.items[0])
  const lines = stack.sourceFile?.text
  return codeFrameColumns(lines!, {
    start: {
      line: stack.line!,
      column: stack.column
    },
  }, {
    message,
    highlightCode: process.env.NODE_ENV === "test" ? false : true
  }) 
}