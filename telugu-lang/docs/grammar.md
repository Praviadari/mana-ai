# Telugu Language Grammar (v0.1)

This document describes the formal grammar of `telugu-lang` using a BNF-like notation.
Telugu keywords are shown in Telugu script; their English equivalents are noted in comments.

---

## Program

```
program     ::= stmt*
```

---

## Statements

```
stmt        ::= print_stmt
              | var_decl
              | assign_stmt
              | if_stmt
              | while_stmt
              | func_decl
              | return_stmt
              | expr_stmt
              | block

print_stmt  ::= 'చెప్పు' '(' expr ')' eos

var_decl    ::= ('వేరియబుల్' | 'స్థిరం') IDENT ('=' expr)? eos

assign_stmt ::= IDENT '=' expr eos

if_stmt     ::= 'అయితే' '(' expr ')' block
                ('లేదంటే' block)?

while_stmt  ::= 'అయ్యే_వరకు' '(' expr ')' block

func_decl   ::= 'పని' IDENT '(' param_list? ')' block

return_stmt ::= 'తిరిగి' expr? eos

expr_stmt   ::= expr eos

block       ::= '{' stmt* '}'

param_list  ::= IDENT (',' IDENT)*

eos         ::= ';' | NEWLINE
```

---

## Expressions (highest to lowest precedence)

```
expr        ::= or_expr

or_expr     ::= and_expr ('లేదా' and_expr)*

and_expr    ::= eq_expr ('మరియు' eq_expr)*

eq_expr     ::= cmp_expr (('==' | '!=') cmp_expr)*

cmp_expr    ::= add_expr (('<' | '>' | '<=' | '>=') add_expr)*

add_expr    ::= mul_expr (('+' | '-') mul_expr)*

mul_expr    ::= unary_expr (('*' | '/' | '%') unary_expr)*

unary_expr  ::= ('కాదు' | '-') unary_expr
              | call_or_primary

call_or_primary ::= primary ('(' arg_list? ')')?

primary     ::= NUMBER
              | STRING
              | 'నిజం'
              | 'అబద్ధం'
              | IDENT
              | '(' expr ')'

arg_list    ::= expr (',' expr)*
```

---

## Lexical elements

```
NUMBER      ::= [0-9]+ ('.' [0-9]+)?
STRING      ::= '"' char* '"' | "'" char* "'"
IDENT       ::= (ASCII_LETTER | '_' | TELUGU_CHAR) (ASCII_LETTER | '_' | DIGIT | TELUGU_CHAR)*
COMMENT     ::= '#' [^\n]*
TELUGU_CHAR ::= U+0C00..U+0C7F
```

---

## Notes

- Statements are separated by newlines or semicolons.
- Comments start with `#` and run to the end of the line.
- Identifiers may be written in Telugu script, ASCII, or a mix.
- `వేరియబుల్` declares a mutable binding; `స్థిరం` declares a constant.
