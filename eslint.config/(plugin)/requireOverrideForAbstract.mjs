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

const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require `override` modifier when implementing an abstract member from a base class',
      recommended: false,
    },
    schema: [],
  },
  create(context) {
    const parserServices = context.parserServices
    if (!parserServices || !parserServices.program) {
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
        const baseTypes =
          classType && classType.getBaseTypes ? classType.getBaseTypes() : []
        if (!baseTypes || baseTypes.length === 0) {
          return
        }

        const bodyElements =
          esClassNode.body && esClassNode.body.body ? esClassNode.body.body : []

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
            parserServices.esTreeNodeToTSNodeMap.get(element) ||
            (element.key &&
              parserServices.esTreeNodeToTSNodeMap.get(element.key))
          if (!tsElement) {
            continue
          }

          const name = getMemberNameFromTS(tsElement)
          if (!name) {
            continue
          }

          let foundAbstract = false
          for (const base of baseTypes) {
            if (!base) {
              continue
            }
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
                const mods = decl.modifiers ?? []
                if (
                  mods.some((m) => m.kind === ts.SyntaxKind.AbstractKeyword)
                ) {
                  foundAbstract = true
                  break
                }
              }
            }
            if (foundAbstract) {
              break
            }
          }
          if (!foundAbstract) {
            continue
          }

          const modifiers = tsElement.modifiers ?? []
          const hasOverride = modifiers.some(
            (m) => m.kind === ts.SyntaxKind.OverrideKeyword
          )
          if (!hasOverride) {
            context.report({
              node: element.key || element,
              message:
                'Implementing an abstract member; add the `override` modifier to make intent explicit.',
            })
          }
        }
      } catch (err) {
        console.error(err)
        return
      }
    }

    return {
      ClassDeclaration(node) {
        checkClassBody(node)
      },
      ClassExpression(node) {
        checkClassBody(node)
      },
    }
  },
}

const plugin = {
  rules: {
    'require-override-for-abstract': rule,
  },
}
export { plugin as pluginRequireOverrideForAbstract }
export default plugin
