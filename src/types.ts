export type Pos = { offset?: number; line?: number; column?: number };
export type Position = { start?: Pos; end?: Pos };
export type LatexNode = {
  type: string;
  content?: string | LatexNode[];
  args?: LatexNode[];
  position?: Position;
} & Record<string, any>;

export type StateData = {
  inFunction?: boolean;
  inArray?: boolean;
};
export interface IState {
  readonly value: string;
  data: StateData;
  write(str: string | undefined): void;
  writeChildren(node: LatexNode): void;
  addWhitespace(): void;
  openFunction(command: string): void;
  closeFunction(): void;
}
