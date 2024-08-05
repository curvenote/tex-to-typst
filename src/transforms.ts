import type { LatexNode } from './types.js';

function ousetMutate(content: LatexNode[]) {
  return content
    .map((node, index) => {
      if (
        node.type === 'macro' &&
        typeof node.content === 'string' &&
        ['overset', 'underset'].includes(node.content)
      ) {
        const next = content?.[index + 1];
        const nextNext = content?.[index + 2];
        if (
          next &&
          typeof next !== 'string' &&
          next.type === 'group' &&
          next.content &&
          nextNext &&
          typeof nextNext !== 'string' &&
          nextNext.type === 'group' &&
          nextNext.content
        ) {
          node.args = [
            {
              type: 'argument',
              content: nextNext.content,
              openMark: '{',
              closeMark: '}',
            },
            {
              type: 'argument',
              content: next.content,
              openMark: '{',
              closeMark: '}',
            },
          ];
          next.type = '__delete__';
          nextNext.type = '__delete__';
        }
      } else if (node.type !== '__delete__') {
        return ousetTransform(node);
      }
      return node;
    })
    .filter((node) => node?.type !== '__delete__');
}

function ousetTransform(tree: LatexNode) {
  if (Array.isArray(tree.content)) {
    tree.content = ousetMutate(tree.content);
  }
  if (Array.isArray(tree.args)) {
    tree.args = ousetMutate(tree.args);
  }
  return tree;
}

export function runTransforms(tree: LatexNode) {
  ousetTransform(tree);
}
