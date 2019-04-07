import { mapValues } from './util';

export type AnyActionCreators = { [key: string]: (...args: any[]) => any };

type CollectionDefinition<S,A> = {
  of: Definition<S,A>,
  key: (item: S) => string,
  contextName?: string
};

type Reducers<S> = {
  [name: string]: (state: S, ...args: any[]) => S
};

export class Definition<State, A /* extends AnyActionCreators */> {
  default?: State;
  combines?: {[key: string]: Definition<any,any>};
  reducers?: Reducers<State>;
  actions?: Partial<A>;
  list?: CollectionDefinition<any,any>;
};

export type StateOf<T> = T extends Definition<infer State, any> ? State : never;
export type ActionCreatorsOf<T> = T extends Definition<any, infer A> ? A : never;

type ActionsFromReducers<R> = {
  [K in keyof R]: R[K] extends (state: any, ...args: infer P) => any ? (...args: P) => {
    type: string,
    args: P,
    context: any,
  } : never
};

export class DefinitionBuilder<S, A /* extends AnyActionCreators */> extends Definition<S,A> {
  constructor(definition: Definition<S,A>) {
    super();
    Object.assign(this, definition);
  }

  addReducers<R extends Reducers<S>>(reducers: R): DefinitionBuilder<S, A & ActionsFromReducers<R>> {
    return new DefinitionBuilder({
      ...this,
      reducers: {...this.reducers, ...reducers}
    } as any);
  }

  addActionCreators<Actions extends {[key: string]: (this: A, ...args: any[]) => any}>(actions: Actions):
      DefinitionBuilder<S, A & Actions> {
    return new DefinitionBuilder({
      ...this,
      actions: {...this.actions, ...actions}
    } as any);
  }

  defineSlice<K extends keyof S, SliceActions /* extends AnyActionCreators */>(name: K, definition: Definition<S[K], SliceActions> | Definition<NonNullable<S[K]>, SliceActions>):
    DefinitionBuilder<S, A & { [key in K]: SliceActions }> {
    return new DefinitionBuilder({
      ...this,
      combines: {...this.combines, [name]: definition}
    } as any);
  }

  use<S2,A2 /* extends AnyActionCreators */>(plugin: (d: this) => DefinitionBuilder<S2,A2>) {
    return plugin(this);
  }
};

export const definition = <State>(defaultValue: State | undefined = undefined) => {
  return new DefinitionBuilder<State, { actionContext: any }>({
    default: defaultValue,
  });
}

export const list = <S,A /* extends AnyActionCreators */>(
  collectionDefinition: CollectionDefinition<S,A>,
  defaultValue: S[] | undefined = undefined
) => {
  return new DefinitionBuilder<S[], {
    actionContext: any,
    $item: (item: string | S) =>  A
  } & { actionContext: any }>({
    default: defaultValue,
    list: collectionDefinition
  });
}

export const combine = <C extends {[key: string]: Definition<any,{}>}>(slices: C) => {
  return new DefinitionBuilder<
    { [K in keyof C]: StateOf<C[K]> },
    { actionContext: any } & {
      [K in keyof C]: ActionCreatorsOf<C[K]>
    }
  >({
    default: mapValues(slices as any, (slice: any) => slice.default) as any,
    combines: slices as any
  });
}
