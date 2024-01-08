import type { LatexNode } from './types.js';

function isEmptyNode(node?: LatexNode): boolean {
  if (!node?.content || node.content.length === 0) return true;
  return false;
}

export const typstStrings: Record<string, string> = {
  ',': 'comma',
};

function splitStrings(node: LatexNode) {
  if (
    node.args?.[0].content?.length === 1 &&
    (node.args?.[0].content as LatexNode[])[0].type === 'string'
  ) {
    node.args[0].content = ((node.args[0].content as LatexNode[])[0].content as string)
      .split('')
      .map((l) => ({ type: 'string', content: l }));
  }
}

export const typstMacros: Record<string, string | ((node: LatexNode) => string)> = {
  cdot: 'dot.op',
  to: 'arrow.r',
  nonumber: '',
  int: 'integral',
  iint: 'integral.double',
  sqrt: (node) => {
    if (isEmptyNode(node.args?.[0])) return 'sqrt';
    return 'root';
  },
  vec: 'arrow',
  mathbf: 'bold',
  boldsymbol: 'bold',
  mathrm: 'upright',
  pm: 'plus.minus',
  partial: 'diff',
  _: (node) => {
    splitStrings(node);
    return '_';
  },
  '^': (node) => {
    splitStrings(node);
    return '^';
  },
  left: (node) => {
    const args = node.args;
    node.args = [];
    const left = (args?.[0].content?.[0] as LatexNode).content;
    if (left === '(') return '(';
    if (left === '[') return '[';
    if (left === '{') return '{';
    if (left === '|') return '|';
    throw new Error(`Undefined left bracket: ${left}`);
  },
  right: (node) => {
    const args = node.args;
    node.args = [];
    const right = (args?.[0].content?.[0] as LatexNode).content;
    if (right === ')') return ')';
    if (right === ']') return ']';
    if (right === '}') return '}';
    if (right === '|') return '|';
    throw new Error(`Undefined right bracket: ${right}`);
  },
  operatorname: (node) => {
    const text = node.args?.slice(-1)[0] as LatexNode;
    node.args = [{ type: 'macro', content: 'text', args: [text] }];
    return 'op';
  },
  '\\': (node) => {
    node.args = [];
    return '\\\n';
  },
  vdots: 'dots.v',
  ddots: 'dots.down',
  sim: 'tilde',
};
