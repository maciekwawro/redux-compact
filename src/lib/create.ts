import * as Schema from './schema';
import { Definition, DefinitionWrapper } from './definition';
import { ActionCreators } from './actionCreators';

type BaseState<S /* extends Schema.Schema */> =
  {} extends Schema.Combines<S> ? Schema.State<S> :
  (Schema.State<S> & { [K in keyof Schema.Combines<S>]: State<Schema.Combines<S>[K]> });
export type State<S /* extends Schema.Schema */> =
  [Schema.ListOf<S>] extends [never] ?
  BaseState<S> :
  BaseState<Schema.ListOf<S>>[];

const createDefaultImpl = <S /*extends Schema.Schema*/>(definition: Definition<S>): State<S> => {
  if (!definition.default || !Object.keys(definition.combines).length) {
    return definition.default as any;
  }

  let result = {...definition.default} as any;
  for (const name in definition.combines) {
    result[name] = createDefaultImpl(definition.combines[name]) as any;
  }
  return result as any;
}

const createDefault = <S /* extends Schema.Schema */>(definitionWrapper: DefinitionWrapper<S>) =>
  createDefaultImpl(definitionWrapper.definition);

type Reducer<S,A> = (state: S, action: A) => S;
type ReducerWithContext<S,P,C> = (state: S, payload: P, context: C) => S;

class ReducerContext<FullState, State, Context> {
  constructor(
    private reducerTemplate: <P,C>(reducer: ReducerWithContext<State,P,C>) => ReducerWithContext<FullState, P, Context & C>
  ) {
  }

  nested<C,S>(
    resolve: (ctx: C, state: State) => S,
    reconcile: (ctx: C, state: State, updated: S) => State
  ): ReducerContext<FullState, S, Context & C> {
    const nestedTemplate = <P,C1>(reducer: ReducerWithContext<S,P,C1>) => {
      return this.reducerTemplate<P,C&C1>(
        (state: State, payload: P, context: C & C1) => {
          const resolved = resolve(context, state);
          const updated = reducer(resolved, payload, context);
          return reconcile(context, state, updated);
        }
      );
    }
    return new ReducerContext<FullState, S, Context & C>(nestedTemplate);
  }

  create<P>(reducer: Reducer<State,P>) {
    const reducerWithContext = this.reducerTemplate(
      (state: State, payload: P, _context: {}) => reducer(state, payload)
    );
    return (state: FullState, action: { payload: P, context: Context}) => {
      return reducerWithContext(state, action.payload, action.context);
    }
  }
};

const createImpl = <FullState, S /* extends Schema.Schema */>(
  definition: Definition<S>,
  actionNamePrefix: string,
  reducerContext: ReducerContext<FullState, State<S>, any>,
  sliceName: string = 'item',
): {
  createActionCreator: ((ctx: any) => ActionCreators<S>),
  reducers: {[key: string]: Reducer<FullState, {payload: any, context: any}>}
} => {
  const actionCreatorPrototype = {};
  const reducers: {[key: string]: Reducer<FullState, {payload: any, context: any}>} = {};

  Object.assign(actionCreatorPrototype, definition.actions);
  for (const name in definition.reducers) {
    const actionType = actionNamePrefix + name;
    Object.assign(actionCreatorPrototype, {
      [name]: function (this: any, payload: any) {
        return {
          type: actionType,
          payload,
          context: this.actionContext
        }
      }
    });
    reducers[actionType] = reducerContext.create(definition.reducers[name] as any);
  }

  for (const name in definition.combines) {
    const rec = createImpl(
      definition.combines[name],
      `${actionNamePrefix}${name}_`,
      reducerContext.nested(
        (_ctx: {}, state: State<S>) => (state as any)[name],
        (_ctx: {}, state: State<S>, updated: any) => ({...state, [name]: updated})
      ),
      name,
    );
    Object.defineProperty(actionCreatorPrototype, name, {
      get: function (this: any) {
        return rec.createActionCreator(this.actionContext);
      }
    })
    Object.assign(reducers, rec.reducers);
  }

  let createActionCreator: any;
  if (definition.list) {
    const listDefinition: {
      of: Definition<any>,
      key: (item: Schema.State<Schema.ListOf<S>>) => string,
    } = definition.list as any;

    const itemDefinition = listDefinition.of;
    const keyOf = (selector: Schema.State<Schema.ListOf<S>> | string ) => {
      return typeof selector === "string" ? selector : listDefinition.key(selector);
    };
    const findIndex = (ctx: any, state: State<S>) => (state as unknown as any[]).findIndex(
      (i: any) => keyOf(i) == keyOf(ctx[sliceName])
    );

    const rec = createImpl(
      itemDefinition,
      `${actionNamePrefix}item_`,
      reducerContext.nested(
        (ctx: any, state: State<S>) => {
          return (state as unknown as any[])[findIndex(ctx, state)];
        },
        (ctx: any, state: State<S>, updated: any) => {
          const result = [...(state as unknown as any[])];
          result.splice(findIndex(ctx, state), 1, updated)
          return result as any;
        }
      )
    );
    Object.assign(reducers, rec.reducers);
    createActionCreator = function (context: any) {
      const itemSelector = function (selector: any) {
        return rec.createActionCreator({...context, [sliceName]: selector});
      }
      Object.assign(itemSelector, actionCreatorPrototype);
      Object.assign(itemSelector, { actionContext: context});
      return itemSelector;
    }
  } else {
    createActionCreator = function (context: any) {
      const actionCreator = Object.create(actionCreatorPrototype);
      Object.assign(actionCreator, { actionContext: context});
      return actionCreator;
    }
  }
  return { createActionCreator, reducers };
}

export const create = <S /* extends Schema.Schema */>(definitionWrapper: DefinitionWrapper<S>): {
  Actions: ActionCreators<S>,
  reduce: (state: State<S> | undefined, action: {type: string, payload: any, context: any}) => State<S>
} => {
  const reducerContext = new ReducerContext<State<S>,State<S>,{}>(reducer => reducer);

  const res = createImpl(definitionWrapper.definition, 'actions_', reducerContext);
  return {
    Actions: res.createActionCreator({}),
    reduce: (state, action) => {
      const nonEmptyState = state == undefined ? createDefault(definitionWrapper) : state;
      return res.reducers[action.type] ?
        res.reducers[action.type](nonEmptyState, action) :
        nonEmptyState
    }
  };
}
