// General statement-padding rules do not visit SvelteScriptElement bodies.
// Enforce the same declaration spacing at the top level of component scripts.
const declarations = new Set([
  "FunctionDeclaration",
  "ClassDeclaration",
  "TSInterfaceDeclaration",
  "TSTypeAliasDeclaration",
  "ExportNamedDeclaration",
  "ExportDefaultDeclaration",
]);

function section(node) {
  if (node.type !== "VariableDeclaration") {
    return;
  }
  const initializer = node.declarations[0]?.init;
  if (initializer?.type !== "CallExpression") {
    return;
  }
  const callee = initializer.callee;
  const name = callee.type === "Identifier" ? callee.name : callee.object?.name;
  if (["$props", "$state", "$derived"].includes(name)) {
    return name;
  }
}

export default {
  rules: {
    "script-spacing": {
      meta: {
        type: "layout",
        fixable: "whitespace",
        schema: [],
        messages: {
          blankLine:
            "Separate script sections and declarations with a blank line.",
        },
      },
      create(context) {
        const sourceCode = context.sourceCode;
        return {
          SvelteScriptElement(script) {
            for (let index = 1; index < script.body.length; index++) {
              const previous = script.body[index - 1];
              const current = script.body[index];
              if (
                previous.type === "ImportDeclaration" &&
                current.type === "ImportDeclaration"
              ) {
                continue;
              }
              const previousSection = section(previous);
              const currentSection = section(current);
              const needsSpacing =
                previous.type === "ImportDeclaration" ||
                declarations.has(previous.type) ||
                declarations.has(current.type) ||
                previousSection === "$props" ||
                (previousSection &&
                  currentSection &&
                  previousSection !== currentSection);
              if (!needsSpacing) {
                continue;
              }
              const between = sourceCode.lines.slice(
                previous.loc.end.line,
                current.loc.start.line - 1,
              );
              if (between.some((line) => !line.trim())) {
                continue;
              }
              context.report({
                node: current,
                messageId: "blankLine",
                fix(fixer) {
                  // Preserve trailing comments on the previous declaration.
                  const endOfLine = sourceCode.text.indexOf(
                    "\n",
                    previous.range[1],
                  );
                  if (endOfLine === -1 || endOfLine >= current.range[0]) {
                    return;
                  }

                  return fixer.insertTextBeforeRange(
                    [endOfLine, endOfLine],
                    "\n",
                  );
                },
              });
            }
          },
        };
      },
    },
  },
};
