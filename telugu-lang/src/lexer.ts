// lexer.ts — Tokeniser for the Telugu programming language
//
// Telugu keyword map:
//   చెప్పు     → PRINT
//   అయితే     → IF
//   లేదంటే    → ELSE
//   అయ్యే_వరకు → WHILE
//   పని       → FUNCTION
//   తిరిగి    → RETURN
//   నిజం      → TRUE
//   అబద్ధం    → FALSE
//   మరియు     → AND
//   లేదా      → OR
//   కాదు      → NOT
//   వేరియబుల్  → LET
//   స్థిరం    → CONST

import { LexerError, SourceLocation } from "./errors";

export const enum TokenKind {
  // Literals
  Number = "Number",
  String = "String",
  Boolean = "Boolean",
  Identifier = "Identifier",

  // Telugu keywords
  Print = "Print",       // చెప్పు
  If = "If",             // అయితే
  Else = "Else",         // లేదంటే
  While = "While",       // అయ్యే_వరకు
  Function = "Function", // పని
  Return = "Return",     // తిరిగి
  Let = "Let",           // వేరియబుల్
  Const = "Const",       // స్థిరం
  True = "True",         // నిజం
  False = "False",       // అబద్ధం
  And = "And",           // మరియు
  Or = "Or",             // లేదా
  Not = "Not",           // కాదు

  // Operators & punctuation
  Assign = "Assign",       // =
  Equal = "Equal",         // ==
  NotEqual = "NotEqual",   // !=
  Lt = "Lt",               // <
  Gt = "Gt",               // >
  Lte = "Lte",             // <=
  Gte = "Gte",             // >=
  Plus = "Plus",           // +
  Minus = "Minus",         // -
  Star = "Star",           // *
  Slash = "Slash",         // /
  Percent = "Percent",     // %
  LParen = "LParen",       // (
  RParen = "RParen",       // )
  LBrace = "LBrace",       // {
  RBrace = "RBrace",       // }
  Comma = "Comma",         // ,
  Semicolon = "Semicolon", // ;
  Newline = "Newline",

  EOF = "EOF",
}

export interface Token {
  kind: TokenKind;
  value: string;
  loc: SourceLocation;
}

// Maps Telugu keyword strings to their token kinds
const KEYWORDS: Record<string, TokenKind> = {
  "చెప్పు": TokenKind.Print,
  "అయితే": TokenKind.If,
  "లేదంటే": TokenKind.Else,
  "అయ్యే_వరకు": TokenKind.While,
  "పని": TokenKind.Function,
  "తిరిగి": TokenKind.Return,
  "వేరియబుల్": TokenKind.Let,
  "స్థిరం": TokenKind.Const,
  "నిజం": TokenKind.True,
  "అబద్ధం": TokenKind.False,
  "మరియు": TokenKind.And,
  "లేదా": TokenKind.Or,
  "కాదు": TokenKind.Not,
};

export class Lexer {
  private pos = 0;
  private line = 1;
  private col = 1;

  constructor(
    private readonly source: string,
    private readonly file?: string
  ) {}

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (!this.atEnd()) {
      const tok = this.nextToken();
      if (tok !== null) tokens.push(tok);
    }
    tokens.push(this.makeToken(TokenKind.EOF, ""));
    return tokens;
  }

  // ── private helpers ──────────────────────────────────────────────────

  private nextToken(): Token | null {
    this.skipWhitespace();
    if (this.atEnd()) return null;

    const ch = this.peek();

    // Comments: # until end of line
    if (ch === "#") {
      while (!this.atEnd() && this.peek() !== "\n") this.advance();
      return null;
    }

    // Newline
    if (ch === "\n") {
      const tok = this.makeToken(TokenKind.Newline, "\n");
      this.advance();
      this.line++;
      this.col = 1;
      return tok;
    }

    // String literal
    if (ch === '"' || ch === "'") return this.readString(ch);

    // Number literal
    if (this.isDigit(ch)) return this.readNumber();

    // Identifiers and keywords (ASCII or Telugu Unicode)
    if (this.isIdentStart(ch)) return this.readIdentOrKeyword();

    // Operators / punctuation
    return this.readPunct();
  }

  private readString(quote: string): Token {
    const loc = this.currentLoc();
    this.advance(); // opening quote
    let value = "";
    while (!this.atEnd() && this.peek() !== quote) {
      if (this.peek() === "\\" ) {
        this.advance();
        const esc = this.advance();
        value += esc === "n" ? "\n" : esc === "t" ? "\t" : esc;
      } else {
        value += this.advance();
      }
    }
    if (this.atEnd()) {
      throw new LexerError("స్ట్రింగ్ మూసబడలేదు", loc);
    }
    this.advance(); // closing quote
    return { kind: TokenKind.String, value, loc };
  }

  private readNumber(): Token {
    const loc = this.currentLoc();
    let value = "";
    while (!this.atEnd() && (this.isDigit(this.peek()) || this.peek() === ".")) {
      value += this.advance();
    }
    return { kind: TokenKind.Number, value, loc };
  }

  private readIdentOrKeyword(): Token {
    const loc = this.currentLoc();
    let value = "";
    while (!this.atEnd() && this.isIdentPart(this.peek())) {
      value += this.advance();
    }
    const kind = KEYWORDS[value] ?? TokenKind.Identifier;
    return { kind, value, loc };
  }

  private readPunct(): Token {
    const loc = this.currentLoc();
    const ch = this.advance();

    const single: Record<string, TokenKind> = {
      "(": TokenKind.LParen,
      ")": TokenKind.RParen,
      "{": TokenKind.LBrace,
      "}": TokenKind.RBrace,
      ",": TokenKind.Comma,
      ";": TokenKind.Semicolon,
      "+": TokenKind.Plus,
      "-": TokenKind.Minus,
      "*": TokenKind.Star,
      "/": TokenKind.Slash,
      "%": TokenKind.Percent,
    };

    if (ch === "=") {
      if (this.peek() === "=") { this.advance(); return { kind: TokenKind.Equal, value: "==", loc }; }
      return { kind: TokenKind.Assign, value: "=", loc };
    }
    if (ch === "!") {
      if (this.peek() === "=") { this.advance(); return { kind: TokenKind.NotEqual, value: "!=", loc }; }
      return { kind: TokenKind.Not, value: "!", loc };
    }
    if (ch === "<") {
      if (this.peek() === "=") { this.advance(); return { kind: TokenKind.Lte, value: "<=", loc }; }
      return { kind: TokenKind.Lt, value: "<", loc };
    }
    if (ch === ">") {
      if (this.peek() === "=") { this.advance(); return { kind: TokenKind.Gte, value: ">=", loc }; }
      return { kind: TokenKind.Gt, value: ">", loc };
    }
    if (ch in single) return { kind: single[ch], value: ch, loc };

    throw new LexerError(`తెలియని అక్షరం: '${ch}'`, loc);
  }

  // ── character classification ──────────────────────────────────────────

  /** Telugu Unicode block: U+0C00–U+0C7F */
  private isTelugu(ch: string): boolean {
    const cp = ch.codePointAt(0) ?? 0;
    return cp >= 0x0c00 && cp <= 0x0c7f;
  }

  private isDigit(ch: string): boolean {
    return ch >= "0" && ch <= "9";
  }

  private isIdentStart(ch: string): boolean {
    return (
      (ch >= "a" && ch <= "z") ||
      (ch >= "A" && ch <= "Z") ||
      ch === "_" ||
      this.isTelugu(ch)
    );
  }

  private isIdentPart(ch: string): boolean {
    return this.isIdentStart(ch) || this.isDigit(ch);
  }

  // ── stream primitives ─────────────────────────────────────────────────

  private atEnd(): boolean {
    return this.pos >= this.source.length;
  }

  private peek(): string {
    return this.source[this.pos];
  }

  private advance(): string {
    const ch = this.source[this.pos++];
    this.col++;
    return ch;
  }

  private skipWhitespace(): void {
    while (!this.atEnd() && (this.peek() === " " || this.peek() === "\t" || this.peek() === "\r")) {
      this.advance();
    }
  }

  private currentLoc(): SourceLocation {
    return { line: this.line, column: this.col, file: this.file };
  }

  private makeToken(kind: TokenKind, value: string): Token {
    return { kind, value, loc: this.currentLoc() };
  }
}
