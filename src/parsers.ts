export interface MatchKeywordReference {
  value: string;
  lineNumber: number;
  startAt: number;
}

export interface MatchBody {
  statements: [
    ...conditions: MatchKeywordReference[],
    action: MatchKeywordReference
  ][];
  fallback?: MatchKeywordReference;
}

export const parseMatch = (lines: string[], startingLine: number) => {
  let parens = 0;
  let brackets = 0;
  let statement = 0;
  lines = startingLine > 0 ? lines.slice(startingLine - 1) : lines;
  const body: MatchBody = {
    statements: [],
  };
  for (let [lineNumber, line] of lines.entries()) {
    let buffer = "";
    let bufferPos = 0;
    const flush = () => {
      body.statements[statement] ??= [] as any;
      body.statements[statement].push({
        value: buffer,
        lineNumber: lineNumber + startingLine,
        startAt: bufferPos,
      });
      bufferPos = 0;
      buffer = "";
    };
    for (let [charNum, char] of line.split("").entries()) {
      if (char === "(") {
        parens++;
        continue;
      }
      if (char === ")") {
        if (parens === 1 && buffer) {
          body.fallback = {
            lineNumber: lineNumber + startingLine,
            value: buffer,
            startAt: bufferPos,
          };
        }
        parens--;
        continue;
      }
      if (char === "[") {
        brackets++;
        continue;
      }
      if (char === "]") {
        if (brackets === 2) {
          flush();
        }
        brackets--;
        statement++;
        continue;
      }
      if (char.match(/\s/)) continue;
      // Inside of statement
      if (parens === 1 && brackets === 2) {
        // Statement ended
        if (char === ",") {
          flush();
          continue;
        }
        // Statement started
        if (buffer === "") {
          bufferPos = charNum;
        }
        buffer += char;
      }

      if (parens === 1 && brackets === 0 && char !== ",") {
        if (buffer === "") {
          bufferPos = charNum;
        }
        buffer += char;
      }
    }
    if (parens === 0) {
      break;
    }
  }
  return body;
};
