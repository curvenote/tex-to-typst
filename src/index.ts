import { unified } from 'unified';
import {
  unifiedLatexFromString,
  unifiedLatexAstComplier,
} from '@unified-latex/unified-latex-util-parse';
import { unifiedLatexAttachMacroArguments } from '@unified-latex/unified-latex-util-arguments';
import { typstMacros, typstStrings } from './macros.js';
import type { LatexNode } from './types.js';

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
    if (!this._value || lastChar.match(/^(["\s_^{(-])$/)) return;
    this._value += ' ';
  }

  _scriptsSimplified = false;

  write(str?: string) {
    if (!str) return;
    // This is a bit verbose, but the statements are much easier to read
    if (this._scriptsSimplified && str === '(') {
      this.addWhitespace();
    } else if (str.match(/^([}()_^,!])$/)) {
      // Ignore!
    } else {
      this.addWhitespace();
    }
    this._scriptsSimplified = false;
    this._value += str.trim();
  }

  _simplify?: boolean;
  _lastFunction?: number;
  _closeToken?: string;

  openFunction(command: string) {
    if (command === 'text') {
      this.addWhitespace();
    } else {
      this.write(command);
    }
    this._simplify = command === '_' || command === '^';
    this._lastFunction = this._value.length;
    this._value += command === 'text' ? '"' : '(';
    this._closeToken = command === 'text' ? '"' : ')';
  }

  closeFunction() {
    this._value += this._closeToken;
    if (!this._simplify) return;
    // We will attempt to change `x_(i)` into `x_i`
    const simple = this._value.slice(this._lastFunction);
    if (simple.length === 3 || simple.match(/^\([a-zA-Z]*\)$/)) {
      this._value = this._value.slice(0, this._lastFunction) + simple.slice(1, -1);
      this._scriptsSimplified = true;
    }
  }
}

function convert(node: LatexNode) {
  if (node.type === 'macro' && typeof node.content === 'string') {
    const result = typstMacros[node.content];
    const converted = typeof result === 'function' ? result(node) : result;
    return converted ?? node.content;
  }
  return '';
}

function convertText(text: string): string {
  const result = typstStrings[text];
  return result || text;
}

export function writeTypst(node: LatexNode, state: IState = new State()) {
  if (node.type === 'whitespace') {
    // We are controlling whitespace in the renderer
    return state;
  } else if (node.type === 'string') {
    state.write(convertText(node.content as string));
  } else if (Array.isArray(node.content)) {
    node.content.forEach((n) => {
      writeTypst(n, state);
    });
  } else if (node.type === 'macro' && Array.isArray(node.args)) {
    state.openFunction(convert(node));
    node.args
      .filter((n) => {
        if (Array.isArray(n.content) && n.content.length === 0) return false;
        return true;
      })
      .forEach((n, i) => {
        if (i !== 0) state.write(',');
        writeTypst(n, state);
      });
    state.closeFunction();
  } else if (node.type === 'macro' && typeof node.content === 'string') {
    const converted = convert(node);
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
