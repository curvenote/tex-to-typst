import type { LatexNode } from './types.js';

function isEmptyNode(node?: LatexNode): boolean {
  if (!node?.content || node.content.length === 0) return true;
  return false;
}

export const typstMacros: Record<string, string | ((node: LatexNode) => string)> = {
  cdot: 'dot.op',
  to: 'arrow.r',
  int: 'integral',
  iint: 'integral.double',
  sqrt: (node) => {
    if (isEmptyNode(node.args?.[0])) return 'sqrt';
    return 'root';
  },
  vec: 'arrow',
  mathbf: 'bold',
  mathrm: 'upright',
};
