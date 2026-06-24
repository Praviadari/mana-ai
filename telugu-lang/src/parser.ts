// parser.ts — Recursive-descent parser; produces an AST from a token stream.

import { Token, TokenKind } from "./lexer";
import { Errors, ParseError } from "./errors";

// ── AST node types ────────────────────────────────────────────────────────────

export type Stmt =
  | PrintStmt
  | VarDecl
  | AssignStmt
  | IfStmt
  | WhileStmt
  | FunctionDecl
  | ReturnStmt
  | ExprStmt
  | Block;

export type Expr =
  | NumberLit
  | StringLit
  | BoolLit
  | Identifier
  | BinaryExpr
  | UnaryExpr
  | CallExpr;

export interface PrintStmt    { type: "PrintStmt";    expr: Expr; }
export interface VarDecl      { type: "VarDecl";      name: string; isConst: boolean; init: Expr | null; }
export interface AssignStmt   { type: "AssignStmt";   name: string; value: Expr; }
export interface IfStmt       { type: "IfStmt";       cond: Expr; then: Block; else_?: Block; }
export interface WhileStmt    { type: "WhileStmt";    cond: Expr; body: Block; }
export interface FunctionDecl { type: "FunctionDecl"; name: string; params: string[]; body: Block; }
export interface ReturnStmt   { type: "ReturnStmt";   value: Expr | null; }
export interface ExprStmt     { type: "ExprStmt";     expr: Expr; }
export interface Block        { type: "Block";        stmts: Stmt[]; }

export interface NumberLit  { type: "NumberLit";  value: number; }
export interface StringLit  { type: "StringLit";  value: string; }
export interface BoolLit    { type: "BoolLit";    value: boolean; }
export interface Identifier  { type: "Identifier"; name: string; }
export interface BinaryExpr  { type: "BinaryExpr"; op: string; left: Expr; right: Expr; }
export interface UnaryExpr   { type: "UnaryExpr";  op: string; operand: Expr; }
export interface CallExpr    { type: "CallExpr";   callee: string; args: Expr[]; }

// ── Parser ────────────────────────────────────────────────────────────────────

export class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  parseProgram(): Block {
    const stmts: Stmt[] = [];
    this.skipNewlines();
    while (!this.atEnd()) {
      stmts.push(this.parseStmt());
      this.skipNewlines();
    }
    return { type: "Block", stmts };
  }

  // ── statements ────────────────────────────────────────────────────────

  private parseStmt(): Stmt {
    const tok = this.peek();

    switch (tok.kind) {
      case TokenKind.Print:    return this.parsePrint();
      case TokenKind.Let:      return this.parseVarDecl(false);
      case TokenKind.Const:    return this.parseVarDecl(true);
      case TokenKind.If:       return this.parseIf();
      case TokenKind.While:    return this.parseWhile();
      case TokenKind.Function: return this.parseFunctionDecl();
      case TokenKind.Return:   return this.parseReturn();
      case TokenKind.LBrace:   return this.parseBlock();
      default:                 return this.parseExprOrAssign();
    }
  }

  private parsePrint(): PrintStmt {
    this.expect(TokenKind.Print);
    this.expect(TokenKind.LParen);
    const expr = this.parseExpr();
    this.expect(TokenKind.RParen);
    this.consumeSemi();
    return { type: "PrintStmt", expr };
  }

  private parseVarDecl(isConst: boolean): VarDecl {
    this.advance(); // consume వేరియబుల్ / స్థిరం
    const name = this.expectIdent();
    let init: Expr | null = null;
    if (this.check(TokenKind.Assign)) {
      this.advance();
      init = this.parseExpr();
    }
    this.consumeSemi();
    return { type: "VarDecl", name, isConst, init };
  }

  private parseIf(): IfStmt {
    this.expect(TokenKind.If);
    this.expect(TokenKind.LParen);
    const cond = this.parseExpr();
    this.expect(TokenKind.RParen);
    const then = this.parseBlock();
    let else_: Block | undefined;
    if (this.check(TokenKind.Else)) {
      this.advance();
      else_ = this.parseBlock();
    }
    return { type: "IfStmt", cond, then, else_ };
  }

  private parseWhile(): WhileStmt {
    this.expect(TokenKind.While);
    this.expect(TokenKind.LParen);
    const cond = this.parseExpr();
    this.expect(TokenKind.RParen);
    const body = this.parseBlock();
    return { type: "WhileStmt", cond, body };
  }

  private parseFunctionDecl(): FunctionDecl {
    this.expect(TokenKind.Function);
    const name = this.expectIdent();
    this.expect(TokenKind.LParen);
    const params: string[] = [];
    if (!this.check(TokenKind.RParen)) {
      params.push(this.expectIdent());
      while (this.check(TokenKind.Comma)) {
        this.advance();
        params.push(this.expectIdent());
      }
    }
    this.expect(TokenKind.RParen);
    const body = this.parseBlock();
    return { type: "FunctionDecl", name, params, body };
  }

  private parseReturn(): ReturnStmt {
    this.expect(TokenKind.Return);
    let value: Expr | null = null;
    if (!this.check(TokenKind.Newline) && !this.check(TokenKind.Semicolon) && !this.check(TokenKind.RBrace) && !this.atEnd()) {
      value = this.parseExpr();
    }
    this.consumeSemi();
    return { type: "ReturnStmt", value };
  }

  private parseBlock(): Block {
    this.expect(TokenKind.LBrace);
    this.skipNewlines();
    const stmts: Stmt[] = [];
    while (!this.check(TokenKind.RBrace) && !this.atEnd()) {
      stmts.push(this.parseStmt());
      this.skipNewlines();
    }
    this.expect(TokenKind.RBrace);
    return { type: "Block", stmts };
  }

  private parseExprOrAssign(): Stmt {
    const expr = this.parseExpr();
    // Assignment: identifier = expr
    if (expr.type === "Identifier" && this.check(TokenKind.Assign)) {
      this.advance();
      const value = this.parseExpr();
      this.consumeSemi();
      return { type: "AssignStmt", name: expr.name, value };
    }
    this.consumeSemi();
    return { type: "ExprStmt", expr };
  }

  // ── expressions (Pratt-style precedence) ──────────────────────────────

  private parseExpr(): Expr { return this.parseOr(); }

  private parseOr(): Expr {
    let left = this.parseAnd();
    while (this.check(TokenKind.Or)) {
      const op = this.advance().value;
      left = { type: "BinaryExpr", op: "||", left, right: this.parseAnd() };
    }
    return left;
  }

  private parseAnd(): Expr {
    let left = this.parseEquality();
    while (this.check(TokenKind.And)) {
      this.advance();
      left = { type: "BinaryExpr", op: "&&", left, right: this.parseEquality() };
    }
    return left;
  }

  private parseEquality(): Expr {
    let left = this.parseComparison();
    while (this.check(TokenKind.Equal) || this.check(TokenKind.NotEqual)) {
      const op = this.advance().value;
      left = { type: "BinaryExpr", op, left, right: this.parseComparison() };
    }
    return left;
  }

  private parseComparison(): Expr {
    let left = this.parseAddSub();
    while (
      this.check(TokenKind.Lt) || this.check(TokenKind.Gt) ||
      this.check(TokenKind.Lte) || this.check(TokenKind.Gte)
    ) {
      const op = this.advance().value;
      left = { type: "BinaryExpr", op, left, right: this.parseAddSub() };
    }
    return left;
  }

  private parseAddSub(): Expr {
    let left = this.parseMulDiv();
    while (this.check(TokenKind.Plus) || this.check(TokenKind.Minus)) {
      const op = this.advance().value;
      left = { type: "BinaryExpr", op, left, right: this.parseMulDiv() };
    }
    return left;
  }

  private parseMulDiv(): Expr {
    let left = this.parseUnary();
    while (this.check(TokenKind.Star) || this.check(TokenKind.Slash) || this.check(TokenKind.Percent)) {
      const op = this.advance().value;
      left = { type: "BinaryExpr", op, left, right: this.parseUnary() };
    }
    return left;
  }

  private parseUnary(): Expr {
    if (this.check(TokenKind.Not)) {
      this.advance();
      return { type: "UnaryExpr", op: "!", operand: this.parseUnary() };
    }
    if (this.check(TokenKind.Minus)) {
      this.advance();
      return { type: "UnaryExpr", op: "-", operand: this.parseUnary() };
    }
    return this.parseCallOrPrimary();
  }

  private parseCallOrPrimary(): Expr {
    const base = this.parsePrimary();
    if (base.type === "Identifier" && this.check(TokenKind.LParen)) {
      this.advance();
      const args: Expr[] = [];
      if (!this.check(TokenKind.RParen)) {
        args.push(this.parseExpr());
        while (this.check(TokenKind.Comma)) {
          this.advance();
          args.push(this.parseExpr());
        }
      }
      this.expect(TokenKind.RParen);
      return { type: "CallExpr", callee: base.name, args };
    }
    return base;
  }

  private parsePrimary(): Expr {
    const tok = this.peek();

    if (tok.kind === TokenKind.Number) {
      this.advance();
      return { type: "NumberLit", value: parseFloat(tok.value) };
    }
    if (tok.kind === TokenKind.String) {
      this.advance();
      return { type: "StringLit", value: tok.value };
    }
    if (tok.kind === TokenKind.True) {
      this.advance();
      return { type: "BoolLit", value: true };
    }
    if (tok.kind === TokenKind.False) {
      this.advance();
      return { type: "BoolLit", value: false };
    }
    if (tok.kind === TokenKind.Identifier) {
      this.advance();
      return { type: "Identifier", name: tok.value };
    }
    if (tok.kind === TokenKind.LParen) {
      this.advance();
      const expr = this.parseExpr();
      this.expect(TokenKind.RParen);
      return expr;
    }

    throw Errors.unexpectedToken(tok.value, tok.loc);
  }

  // ── utilities ─────────────────────────────────────────────────────────

  private peek(): Token { return this.tokens[this.pos]; }

  private advance(): Token {
    const tok = this.tokens[this.pos];
    if (tok.kind !== TokenKind.EOF) this.pos++;
    return tok;
  }

  private atEnd(): boolean {
    return this.tokens[this.pos]?.kind === TokenKind.EOF;
  }

  private check(kind: TokenKind): boolean {
    return this.tokens[this.pos]?.kind === kind;
  }

  private expect(kind: TokenKind): Token {
    if (!this.check(kind)) {
      const got = this.tokens[this.pos];
      throw Errors.expectedToken(kind, got.value, got.loc);
    }
    return this.advance();
  }

  private expectIdent(): string {
    const tok = this.tokens[this.pos];
    if (tok.kind !== TokenKind.Identifier) {
      throw Errors.expectedToken("పేరు (identifier)", tok.value, tok.loc);
    }
    this.advance();
    return tok.value;
  }

  private consumeSemi(): void {
    while (this.check(TokenKind.Semicolon) || this.check(TokenKind.Newline)) {
      this.advance();
    }
  }

  private skipNewlines(): void {
    while (this.check(TokenKind.Newline)) this.advance();
  }
}
