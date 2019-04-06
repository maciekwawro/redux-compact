import * as Schema from './schema';
import { ActionCreators } from './actionCreators';
import { mapValues } from './util';

type ReducersPayload<R> = {
  [K in keyof R]: R[K] extends (a: any, payload: infer R) => any ? R : never
};
type SliceSchemas<C> = {
  [K in keyof C]: C[K] extends DefinitionWrapper<infer S> ? S : never
};

export type Definition<S /* extends Schema.Schema */> = {
  default?: Schema.State<S>, // TODO
  combines: {
    [K in keyof Schema.Combines<S>]: Definition<Schema.Combines<S>[K]>
  },
  reducers: {
    [K in keyof Schema.ReducerPayload<S>]: (state: Schema.State<S>, payload: Schema.ReducerPayload<S>[K]) => Schema.State<S>
  },
  actions: Schema.Actions<S>,
  list: [Schema.ListOf<S>] extends [never] ? undefined : {
    of: Definition<Schema.ListOf<S>>,
    key: (item: Schema.State<Schema.ListOf<S>>) => string,
  }
};

type Reducers<S> = {
  [name: string]: (state: Schema.State<S>, payload: any) => Schema.State<S>
};

export class DefinitionWrapper<S /* extends Schema.Schema */> {
  constructor(public definition: Definition<S>) {
  }

  addReducers<R extends Reducers<S>>(reducers: R): DefinitionWrapper<{
    state: Schema.State<S>,
    reducerPayload: {
      [K in keyof (Schema.ReducerPayload<S> & ReducersPayload<R>)]: (Schema.ReducerPayload<S> & ReducersPayload<R>)[K]
    },
    actions: Schema.Actions<S>,
    combines: Schema.Combines<S>,
    listOf: Schema.ListOf<S>,
  }> {
    return new DefinitionWrapper({
      ...this.definition,
      reducers: {...this.definition.reducers, ...reducers}
    } as any);
  }

  addActionCreators<A extends {[key: string]: (this: ActionCreators<S>, ...args: any[]) => any}>(actions: A): DefinitionWrapper<{
    state: Schema.State<S>,
    reducerPayload: Schema.ReducerPayload<S>,
    actions: {
      [K in keyof (Schema.Actions<S> & A)]: (Schema.Actions<S> & A)[K]
    },
    combines: Schema.Combines<S>,
    listOf: Schema.ListOf<S>
  }> {
    return new DefinitionWrapper({
      ...this.definition,
      actions: {...this.definition.actions, ...actions}
    } as any);
  }

  combineWith<C extends {[key: string]: DefinitionWrapper<any>}>(slices: C): DefinitionWrapper<{
    state: Schema.State<S>,
    reducerPayload: Schema.ReducerPayload<S>,
    actions: Schema.Actions<S>,
    combines: {
      [K in keyof (Schema.Combines<S> & SliceSchemas<C>)]: (Schema.Combines<S> & SliceSchemas<C>)[K]
    },
    listOf: Schema.ListOf<S>,
  }> {
    return new DefinitionWrapper({
      ...this.definition,
      combines: {...this.definition.combines, ...mapValues(slices, w => w.definition)}
    } as any);
  }

  use<S2>(plugin: (d: this) => DefinitionWrapper<S2>) {
    return plugin(this);
  }
}

export const definition = <State>(defaultValue: State | undefined = undefined) => {
  return new DefinitionWrapper<{state: State, reducerPayload: {}, actions: {}, combines: {}}>({
    reducers: {},
    actions: {},
    default: defaultValue,
    combines: {},
    list: undefined
  });
}

export const list = <S extends Schema.Schema>(
  of: DefinitionWrapper<S>,
  key: (item: Schema.State<S>) => string,
  defaultValue: Schema.State<S>[] | undefined = undefined
) => {
  return new DefinitionWrapper<{state: Schema.State<S>[], reducerPayload: {}, combines: {}, actions: {}, listOf: S}>({
    default: defaultValue,
    combines: {},
    reducers: {},
    actions: {},
    list: {
      of: of.definition,
      key
    } as any
  });
}

export const combine = <C extends {[key: string]: DefinitionWrapper<any>}>(slices: C) => {
  return definition<{}>({}).combineWith(slices);
}
