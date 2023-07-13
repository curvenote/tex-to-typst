export type Pos = { offset?: number; line?: number; column?: number };
export type Position = { start?: Pos; end?: Pos };
export type LatexNode = {
  type: string;
  content?: string | LatexNode[];
  args?: LatexNode[];
  position?: Position;
} & Record<string, any>;
