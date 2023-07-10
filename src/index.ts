import { unified } from 'unified';
import {
  unifiedLatexFromString,
  unifiedLatexAstComplier,
} from '@unified-latex/unified-latex-util-parse';
import { unifiedLatexAttachMacroArguments } from '@unified-latex/unified-latex-util-arguments';
import { typstMacros } from './macros.js';

export function parseLatex(value: string) {
  const file = unified()
    .use(unifiedLatexFromString, { mode: 'math' })
    .use(unifiedLatexAstComplier)
    .use(unifiedLatexAttachMacroArguments, { macros: { vec: { signature: 'm' } } })
    .processSync({ value });
  const content = (file.result as any).content;
  const tree = { type: 'math', content };
  return tree;
}

export * from './macros.js';

type Pos = { offset?: number; line?: number; column?: number };
type Position = { start?: Pos; end?: Pos };
type LatexNode = {
  type: string;
  content?: string | LatexNode[];
  position?: Position;
} & Record<string, any>;

export function walkLatex(node: LatexNode) {
  delete node.position;
  if (Array.isArray(node.content)) {
    const content = (node.content as LatexNode[]).map((n) => walkLatex(n)) as any;
    return { ...node, content };
  }
  if (Array.isArray(node.args)) {
    const args = (node.args as LatexNode[]).map((n) => walkLatex(n)) as any;
    return { ...node, args };
  }
  return node;
}

interface IState {
  readonly value: string;
  write(str: string | undefined): void;
  addWhitespace(): void;
  openFunction(command: string): void;
  closeFunction(): void;
}

class State implements IState {
  _value: string;

  constructor() {
    this._value = '';
  }

  get value() {
    return this._value;
  }

  addWhitespace() {
    const lastChar = this.value.slice(-1);
    if (!this._value || lastChar.match(/^([\s_{(-])$/)) return;
    this._value += ' ';
  }

  write(str?: string) {
    if (!str) return;
    if (!str.match(/^([})_^,])$/)) this.addWhitespace();
    this._value += str.trim();
  }

  _simplify?: boolean;
  _lastFunction?: number;

  openFunction(command: string) {
    this.write(command);
    this._simplify = command === '_' || command === '^';
    this._lastFunction = this._value.length;
    this._value += '(';
  }
  closeFunction() {
    this._value += ')';
    if (!this._simplify) return;
    const simple = this._value.slice(this._lastFunction);
    if (simple.length === 3 || simple.match(/^\([a-zA-Z]*\)$/)) {
      this._value = this._value.slice(0, this._lastFunction) + simple.slice(1, -1);
    }
  }
}

function convert(node: LatexNode) {
  if (node.type === 'macro' && typeof node.content === 'string') {
    const converted = typstMacros[node.content];
    return converted ?? node.content;
  }
  return '';
}

export function writeTypst(node: LatexNode, state: IState = new State()) {
  if (node.type === 'whitespace') {
    // We are controlling whitespace in the renderer
    return state;
  } else if (node.type === 'string') {
    state.write(node.content as string);
  } else if (Array.isArray(node.content)) {
    (node.content as LatexNode[]).forEach((n) => {
      writeTypst(n, state);
    });
  } else if (node.type === 'macro' && Array.isArray(node.args)) {
    state.openFunction(convert(node));
    (node.args as LatexNode[])
      .filter((n) => {
        // Initially added this for sqrt which has multiple args
        if (typeof n.content === 'string' && !n.content) return false;
        if (Array.isArray(n.content) && n.content.length === 0) return false;
        return true;
      })
      .forEach((n, i) => {
        if (i !== 0) state.write(',');
        writeTypst(n, state);
      });
    state.closeFunction();
  } else if (node.type === 'macro' && typeof node.content === 'string') {
    const converted = typstMacros[node.content as any];
    state.write(converted ?? node.content);
  }
  return state;
}

export function texToTypst(value: string): string {
  const tree = parseLatex(value);
  walkLatex(tree);
  const state = writeTypst(tree);
  return state.value;
}
