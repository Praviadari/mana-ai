#!/usr/bin/env node
// cli.ts — Command-line interface: `mana run <file.tel>`

import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";
import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Transpiler } from "./transpiler";
import { TeluguLangError } from "./errors";

const USAGE = `
mana — Telugu programming language runner

వినియోగం:
  mana run <file.tel>     .tel ఫైల్‌ను అమలు చేయండి
  mana transpile <file>   JavaScript కి మార్చండి (stdout కు)
  mana version            వెర్షన్ చూపించు
  mana help               ఈ సహాయాన్ని చూపించు
`.trim();

function compile(source: string, file: string): string {
  const lexer = new Lexer(source, file);
  const tokens = lexer.tokenize();

  const parser = new Parser(tokens);
  const ast = parser.parseProgram();

  const transpiler = new Transpiler();
  return transpiler.transpile(ast);
}

function runFile(filePath: string): void {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    console.error(`[లోపం] ఫైల్ కనుగొనబడలేదు: ${abs}`);
    process.exit(1);
  }

  const source = fs.readFileSync(abs, "utf-8");
  let js: string;
  try {
    js = compile(source, abs);
  } catch (err) {
    if (err instanceof TeluguLangError) {
      console.error(err.format());
    } else {
      console.error(err);
    }
    process.exit(1);
  }

  try {
    const context = vm.createContext({ console, require, process });
    vm.runInContext(js, context, { filename: abs });
  } catch (err) {
    console.error(`[రన్‌టైమ్ లోపం] ${(err as Error).message}`);
    process.exit(1);
  }
}

function transpileFile(filePath: string): void {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    console.error(`[లోపం] ఫైల్ కనుగొనబడలేదు: ${abs}`);
    process.exit(1);
  }
  const source = fs.readFileSync(abs, "utf-8");
  try {
    console.log(compile(source, abs));
  } catch (err) {
    if (err instanceof TeluguLangError) {
      console.error(err.format());
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

function main(): void {
  const [, , cmd, ...args] = process.argv;

  switch (cmd) {
    case "run":
      if (!args[0]) { console.error("ఫైల్ పేరు అవసరం."); process.exit(1); }
      runFile(args[0]);
      break;

    case "transpile":
      if (!args[0]) { console.error("ఫైల్ పేరు అవసరం."); process.exit(1); }
      transpileFile(args[0]);
      break;

    case "version":
      console.log("telugu-lang v0.1.0");
      break;

    case "help":
    default:
      console.log(USAGE);
      break;
  }
}

main();
