import type { IState, LatexNode } from './types.js';

function isEmptyNode(node?: LatexNode): boolean {
  if (!node?.content || node.content.length === 0) return true;
  return false;
}

export const typstStrings: Record<string, string | ((state: IState) => string)> = {
  ',': (state) => (state.data.inFunction ? 'comma' : ','),
  '&': (state) => (state.data.inArray ? ',' : '&'),
  '/': '\\/',
  ';': '\\;',
  '~': 'med',
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

export const typstMacros: Record<string, string | ((state: IState, node: LatexNode) => string)> = {
  cdot: 'dot.op',
  to: 'arrow.r',
  rightarrow: 'arrow.r',
  leftarrow: 'arrow.l',
  leftrightarrow: 'arrow.l.r',
  gets: 'arrow.l',
  infin: 'infinity', // This is a mathjax only thing, https://docs.mathjax.org/en/v2.7-latest/tex.html#i
  infty: 'infinity', // oo
  nonumber: '',
  int: 'integral',
  iint: 'integral.double',
  sqrt: (state, node) => {
    if (isEmptyNode(node.args?.[0])) return 'sqrt';
    return 'root';
  },
  vec: 'arrow',
  mathbf: 'bold',
  boldsymbol: 'bold',
  mathrm: 'upright',
  textrm: 'upright',
  rm: 'upright',
  mathcal: 'cal',
  mathfrak: 'frak',
  pm: 'plus.minus',
  partial: 'diff',
  _: (state, node) => {
    splitStrings(node);
    return '_';
  },
  '^': (state, node) => {
    splitStrings(node);
    return '^';
  },
  left: (state, node) => {
    const args = node.args;
    node.args = [];
    const left = (args?.[0].content?.[0] as LatexNode).content;
    if (left === '(') return '(';
    if (left === '[') return '[';
    if (left === '{') return '{';
    if (left === '|') return '|';
    if (left === '.') return '';
    throw new Error(`Undefined left bracket: ${left}`);
  },
  right: (state, node) => {
    const args = node.args;
    node.args = [];
    const right = (args?.[0].content?.[0] as LatexNode).content;
    if (right === ')') return ')';
    if (right === ']') return ']';
    if (right === '}') return '}';
    if (right === '|') return '|';
    if (right === '.') return '';
    throw new Error(`Undefined right bracket: ${right}`);
  },
  operatorname: (state, node) => {
    const text = node.args?.slice(-1)[0] as LatexNode;
    node.args = [{ type: 'macro', content: 'text', args: [text] }];
    return 'op';
  },
  '\\': (state, node) => {
    node.args = [];
    if (state.data.inArray) return ';';
    return '\\\n';
  },
  sim: 'tilde',
  cong: 'tilde.equiv',
  simeq: 'tilde.eq',
  ne: '!=',
  phi: 'phi.alt',
  varphi: 'phi.alt',
  varepsilon: 'epsilon',
  propto: 'prop',
  doteq: 'dot(eq)',
  ge: 'gt.eq',
  geq: 'gt.eq',
  le: 'lt.eq',
  leq: 'lt.eq',
  neq: 'eq.not',
  otimes: 'times.circle',
  dot: 'dot',
  ddot: 'dot.double',
  dots: 'dots.h',
  ldots: 'dots.h',
  vdots: 'dots.v',
  ddots: 'dots.down',
  subseteq: 'subset.eq',
  cdots: 'dots.h.c',
  cap: 'sect',
  cup: 'union',
  widehat: 'hat',
  // Spaces
  ',': 'thin',
  ':': 'med',
  ';': 'thick',
  '!': '#h(-1em)',
  quad: 'quad',
  qquad: 'wide',
  prod: 'product',
  biggl: '',
  biggr: '',
  mathbb: (state, node) => {
    const text =
      (((node.args?.slice(-1)[0] as LatexNode)?.content?.[0] as LatexNode)?.content as string) ??
      '';
    const letters = text
      .split('')
      .map((l) => `${l}${l}`)
      .join(' ');
    node.args = [];
    return letters;
  },
  mathscr: (state) => {
    state.useMacro(`#let scr(it) = text(features: ("ss01",), box($cal(it)$))`);
    return 'scr';
  },
  overset: (state, node) => {
    state.useMacro('#import "@preview/ouset:0.2.0": *');
    node.args = node.args?.reverse();
    return 'overset';
  },
  underset: (state, node) => {
    state.useMacro('#import "@preview/ouset:0.2.0": *');
    node.args = node.args?.reverse();
    return 'underset';
  },
};

export const typstEnvs: Record<string, (state: IState, node: LatexNode) => void> = {
  array: (state, node) => {
    state.data.inArray = true;
    state.openFunction('mat');
    // TODO: transform the surrounding brackets into arguments
    state.write('delim: #none,');
    state.writeChildren(node);
    state.closeFunction();
    state.data.inArray = false;
  },
};
