import { mapValues } from './util';

export type ActionCreatorsBase = {
  $context: {[key: string]: string}
};

type CollectionDefinition<S,A> = {
  of: Definition<S,A,false>,
  key: (item: S) => string,
  contextName?: string
};

type Reducers<S> = {
  [name: string]: (state: S, ...args: any[]) => S
};

export abstract class Definition<State, A, HasDefault> {
  hasDefault!: HasDefault;
  default!: true extends HasDefault ? State : State | undefined;
  combines?: {[key: string]: Definition<any,any,true>};
  reducers?: Reducers<State>;
  actions?: Partial<A>;
  list?: CollectionDefinition<any,any>;
};

export type StateOf<T> = T extends Definition<infer State, any, any> ? State : never;
export type ActionCreatorsOf<T> = T extends Definition<any, infer A, any> ? A : never;

type ActionsFromReducers<R> = {
  [K in keyof R]: R[K] extends (state: any, ...args: infer P) => any ? (...args: P) => {
    type: string,
    args: P,
    context: {[key: string]: string},
  } : never
};

export class DefinitionBuilder<S, A, HasDefault> extends Definition<S,A,HasDefault> {
  constructor(definition: Definition<S,A,HasDefault>) {
    super();
    Object.assign(this, definition);
  }

  addReducers<R extends Reducers<S>>(reducers: R): DefinitionBuilder<S, A & ActionsFromReducers<R>,HasDefault> {
    return new DefinitionBuilder({
      ...this,
      reducers: {...this.reducers, ...reducers}
    } as any);
  }

  addActionCreators<Actions extends {[key: string]: (this: A, ...args: any[]) => any}>(actions: Actions):
      DefinitionBuilder<S, A & Actions,HasDefault> {
    return new DefinitionBuilder({
      ...this,
      actions: {...this.actions, ...actions}
    } as any);
  }

  defineSlice<K extends keyof NonNullable<S>, SliceActions /* extends AnyActionCreators */>(name: K, definition: Definition<NonNullable<S>[K], SliceActions,any>):
    DefinitionBuilder<S, A & { [key in K]: SliceActions }, HasDefault> {
    return new DefinitionBuilder({
      ...this,
      combines: {...this.combines, [name]: definition}
    } as any);
  }

  setDefault(value: S) {
    return new DefinitionBuilder<S,A,true>({
      ...this,
      default: value,
      hasDefault: true,
    });
  }

  use<R>(plugin: (d: this) => R) {
    return plugin(this);
  }
};

export function definition<State>() {
  return new DefinitionBuilder<State, ActionCreatorsBase, false>({
    hasDefault: false,
    default: undefined
  });
}

const listBase = <S, A, State extends S[] | undefined | null>(
  collectionDefinition: CollectionDefinition<S,A>,
  defaultValue: State
) => {
  return new DefinitionBuilder<State, {
    $item: (item: string | S) =>  A
  } & ActionCreatorsBase, true>({
    hasDefault: true,
    default: defaultValue,
    list: collectionDefinition
  });
}

export const list = <S,A>(collectionDefinition: CollectionDefinition<S,A>) =>
  listBase<S,A,S[]>(collectionDefinition, []);
export const nullableList = <S,A,D extends undefined | null>(collectionDefinition: CollectionDefinition<S,A>, defaultValue: D) =>
  listBase<S,A,S[] | D>(collectionDefinition, defaultValue);

export const combine = <C extends {[key: string]: Definition<any,{},true>}>(slices: C) => {
  return new DefinitionBuilder<
    { [K in keyof C]: StateOf<C[K]> },
    ActionCreatorsBase & { [K in keyof C]: ActionCreatorsOf<C[K]> },
    true
  >({
    hasDefault: true,
    default: mapValues(slices as any, (slice: any) => slice.default) as any,
    combines: slices as any
  });
}
