// errors.ts — Telugu-language error messages and error types

export interface SourceLocation {
  line: number;
  column: number;
  file?: string;
}

export class TeluguLangError extends Error {
  readonly location?: SourceLocation;

  constructor(message: string, location?: SourceLocation) {
    super(message);
    this.name = "TeluguLangError";
    this.location = location;
  }

  format(): string {
    if (this.location) {
      const file = this.location.file ?? "<stdin>";
      return `[లోపం] ${file}:${this.location.line}:${this.location.column} — ${this.message}`;
    }
    return `[లోపం] ${this.message}`;
  }
}

export class LexerError extends TeluguLangError {
  constructor(message: string, location?: SourceLocation) {
    super(message, location);
    this.name = "LexerError";
  }
}

export class ParseError extends TeluguLangError {
  constructor(message: string, location?: SourceLocation) {
    super(message, location);
    this.name = "ParseError";
  }
}

export class TranspileError extends TeluguLangError {
  constructor(message: string, location?: SourceLocation) {
    super(message, location);
    this.name = "TranspileError";
  }
}

// Telugu error message helpers
export const Errors = {
  unexpectedChar: (ch: string, loc?: SourceLocation) =>
    new LexerError(`తెలియని అక్షరం: '${ch}'`, loc),

  unexpectedToken: (token: string, loc?: SourceLocation) =>
    new ParseError(`ఊహించని పదం: '${token}'`, loc),

  expectedToken: (expected: string, got: string, loc?: SourceLocation) =>
    new ParseError(
      `'${expected}' అవసరం, కానీ '${got}' కనిపించింది`,
      loc
    ),

  undefinedVariable: (name: string, loc?: SourceLocation) =>
    new TranspileError(`నిర్వచించబడని వేరియబుల్: '${name}'`, loc),

  unexpectedEOF: (loc?: SourceLocation) =>
    new ParseError("ఫైల్ అనూహ్యంగా ముగిసింది", loc),
};
