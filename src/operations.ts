import StackTracey from "stacktracey";
import { Context } from "./context";

export type Operation = Validate | Update | Load | Match | Do | GoTo;

export interface Validate extends BaseOperation {
  type: "validate";
  run: (arg: any) => boolean | Promise<boolean>;
  argKey: any;
}

export interface Update extends BaseOperation {
  type: "update";
  run: (arg: any, context: any) => any | Promise<any>;
  argKey: any;
}

export interface Load extends BaseOperation {
  type: "load";
  run: (arg: any) => any | Promise<any>;
}

export type MatchCondition<C> = (context: C) => boolean | Promise<boolean>;
export type MatchAction<C> = (
  context: C
) => void | Partial<C> | Promise<void | Partial<C>>;
export type MatchStatement<C> = [...MatchCondition<C>[], MatchAction<C>];
export interface Match extends BaseOperation {
  type: "match";
  statements: MatchStatement<any>[];
  otherwise?: MatchAction<any>;
}

export interface Do extends BaseOperation {
  type: "do";
  run: (context: any) => void | Promise<void>;
}

export interface GoTo extends BaseOperation {
  type: "goto";
}

interface BaseOperation {
  readonly type: string;
  label?: string;
  onError?: (
    err: Error,
    context: any
  ) => any | Promise<any>
    
  /**
   * Note: An error is created in the original call site to link back to the code that's actually
   * triggering the error, not from the process it's being called in.
   */
  stackSource: StackTracey;
  context: Context;
}
