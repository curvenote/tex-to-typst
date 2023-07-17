import fs from 'fs';
import { unified } from 'unified';
import {
  unifiedLatexFromString,
  unifiedLatexAstComplier,
} from '@unified-latex/unified-latex-util-parse';
import {
  unifiedLatexAttachMacroArguments,
  gobbleArguments,
} from '@unified-latex/unified-latex-util-arguments';
import { typstMacros, typstStrings } from './macros.js';
import type { LatexNode } from './types.js';

export function parseLatex(value: string) {
  const file = unified()
    .use(unifiedLatexFromString, { mode: 'math' })
    .use(unifiedLatexAstComplier)
    .use(unifiedLatexAttachMacroArguments, {
      macros: {
        vec: { signature: 'm' },
        boldsymbol: { signature: 'm' },
        left: { signature: 'm' },
        right: { signature: 'm' },
      },
    })
    .processSync({ value });
  const content = (file.result as any).content;
  const tree = { type: 'math', content };
  return tree;
}

export * from './macros.js';

export function walkLatex(node: LatexNode) {
  delete node.position;
  if (Array.isArray(node.content)) {
    const content = (node.content as LatexNode[]).map((n) => walkLatex(n)) as LatexNode[];
    let skip = 0;
    const parsed = content.reduce((list, next, i, array) => {
      if (skip > 0) {
        skip -= 1;
        return list;
      }
      if (next.type === 'string' && (next.content === '_' || next.content === '^')) {
        const { args, nodesRemoved } = gobbleArguments(array.slice(i + 1), 'm');
        next.type = 'macro';
        next.args = args;
        skip += nodesRemoved;
      }
      if (
        next.type === 'macro' &&
        (next.content === 'overbrace' || next.content === 'underbrace')
      ) {
        const { args, nodesRemoved } = gobbleArguments(array.slice(i + 1), 'm');
        if (
          args[0].content.length === 1 &&
          args[0].content[0].type === 'macro' &&
          ((args[0].content[0].content === '^' && next.content === 'overbrace') ||
            (args[0].content[0].content === '_' && next.content === 'underbrace'))
        ) {
          next.args = [...(next.args ?? []), ...args[0].content[0].args];
          skip += nodesRemoved;
        }
      }
      list.push(next);
      return list;
    }, [] as LatexNode[]);
    node.content = parsed;
    return { ...node, content: parsed };
  }
  if (Array.isArray(node.args)) {
    const args = (node.args as LatexNode[]).map((n) => walkLatex(n)) as LatexNode[];
    node.args = args;
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
    this._value += str;
  }

  _simplify?: boolean;
  _lastFunction?: number;
  _closeToken: string[] = [];

  openFunction(command: string) {
    if (command === 'text') {
      this.addWhitespace();
    } else {
      this.write(command);
    }
    this._simplify = command === '_' || command === '^';
    this._lastFunction = this._value.length;
    this._value += command === 'text' ? '"' : '(';
    this._closeToken.push(command === 'text' ? '"' : ')');
  }

  closeFunction() {
    this._value += this._closeToken.pop() || ')';
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
    const converted = convert(node);
    if (node.args.length === 0) {
      state.write(converted);
      return state;
    }
    state.openFunction(converted);
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
