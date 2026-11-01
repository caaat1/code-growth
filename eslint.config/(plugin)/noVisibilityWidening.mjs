import ts from 'typescript'

function getMemberNameFromTS(node) {
  if (!node || !('name' in node) || !node.name) {
    return null
  }
  const nameNode = node.name
  if (
    ts.isIdentifier(nameNode) ||
    ts.isStringLiteral(nameNode) ||
    ts.isNumericLiteral(nameNode)
  ) {
    return nameNode.text
  }
  return null
}

function getAccessibilityRank(modifiers) {
  if (!modifiers) {
    return 2
  }
  for (const m of modifiers) {
    if (m.kind === ts.SyntaxKind.PrivateKeyword) {
      return 0
    }
    if (m.kind === ts.SyntaxKind.ProtectedKeyword) {
      return 1
    }
  }
  return 2
}

const RANK_NAME = ['private', 'protected', 'public']

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        "Disallow widening a member's visibility beyond what the base class declares",
      recommended: false,
    },
    schema: [],
    messages: {
      visibilityWidened:
        "Member '{{name}}' widens visibility from '{{base}}' (base) to '{{child}}'; keep it '{{base}}'.",
    },
  },
  create(context) {
    const parserServices =
      context.parserServices ?? context.sourceCode.parserServices
    if (!parserServices?.program) {
      return {}
    }
    const checker = parserServices.program.getTypeChecker()

    function checkClassBody(esClassNode) {
      try {
        if (!parserServices.esTreeNodeToTSNodeMap) {
          return
        }
        const tsClassNode =
          parserServices.esTreeNodeToTSNodeMap.get(esClassNode)
        if (!tsClassNode) {
          return
        }

        const classType = checker.getTypeAtLocation(tsClassNode)
        const baseTypes = classType?.getBaseTypes?.() ?? []
        if (baseTypes.length === 0) {
          return
        }

        const bodyElements = esClassNode.body?.body ?? []

        for (const element of bodyElements) {
          if (
            element.type !== 'MethodDefinition' &&
            element.type !== 'PropertyDefinition'
          ) {
            continue
          }
          if (element.kind === 'constructor') {
            continue
          }

          const tsElement =
            parserServices.esTreeNodeToTSNodeMap.get(element) ??
            (element.key &&
              parserServices.esTreeNodeToTSNodeMap.get(element.key))
          if (!tsElement) {
            continue
          }

          const name = getMemberNameFromTS(tsElement)
          if (!name) {
            continue
          }

          // Find the strictest accessibility declared for this member across all direct base types.
          // base.getProperty() walks inherited members, so grandparent declarations are covered.
          let baseRank = null
          for (const base of baseTypes) {
            const prop = base.getProperty(name)
            if (!prop) {
              continue
            }
            for (const decl of prop.declarations ?? []) {
              if (
                ts.isMethodDeclaration(decl) ||
                ts.isPropertyDeclaration(decl) ||
                ts.isGetAccessor(decl) ||
                ts.isSetAccessor(decl)
              ) {
                const rank = getAccessibilityRank(decl.modifiers)
                if (baseRank === null || rank < baseRank) {
                  baseRank = rank
                }
              }
            }
          }

          if (baseRank === null) {
            continue
          }

          const childRank = getAccessibilityRank(tsElement.modifiers)
          if (childRank > baseRank) {
            context.report({
              node: element.key ?? element,
              messageId: 'visibilityWidened',
              data: {
                name,
                base: RANK_NAME[baseRank],
                child: RANK_NAME[childRank],
              },
            })
          }
        }
      } catch (err) {
        console.error(err)
      }
    }

    return {
      ClassDeclaration: checkClassBody,
      ClassExpression: checkClassBody,
    }
  },
}

const plugin = {
  rules: {
    'no-visibility-widening': rule,
  },
}
export { plugin as pluginNoVisibilityWidening }
export default plugin
