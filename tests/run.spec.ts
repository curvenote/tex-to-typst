import { describe, test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { parseLatex, texToTypst } from '../src';

type TestCase = {
  title: string;
  tex: string;
  typst: string;
  skip: boolean;
};

const only = '';

type TestCases = {
  title: string;
  cases: TestCase[];
};

const casesList: TestCases[] = fs
  .readdirSync(__dirname)
  .filter((file) => file.endsWith('.yml'))
  .map((file) => {
    const content = fs.readFileSync(path.join(__dirname, file), { encoding: 'utf-8' });
    return yaml.load(content) as TestCases;
  });

casesList.forEach(({ title, cases }) => {
  const skipped = cases.filter((c) => c.skip);
  const filtered = only ? cases.filter((c) => c.title === only) : cases.filter((c) => !c.skip);
  if (filtered.length === 0) return;
  describe(title, () => {
    test.each(filtered.map((c): [string, TestCase] => [c.title, c]))('%s', (_, { tex, typst }) => {
      if (only) {
        console.log(yaml.dump(parseLatex(tex)));
      }
      const result = texToTypst(tex);
      expect(result).toEqual(typst);
    });
    if (skipped.length > 0 && !only) {
      test.skip.each(skipped.map((c): [string, TestCase] => [c.title, c]))('%s', () => {
        throw new Error('Skip');
      });
    }
  });
});
