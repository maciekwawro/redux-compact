import { Definition } from './definition';
import { mapValues, warn } from './util';

type ReducerWithContext<S,Args,C> = (state: S, args: Args, context: C) => S;

const createImpl = <S, A /* extends AnyActionCreators */>(
  definition: Definition<S,A>,
  contextName: string,
): {
  createActionCreator: ((ctx: any) => A),
  reducers: {[key: string]: ReducerWithContext<S, any, any>}
} => {
  const actionCreatorPrototype = {};
  const reducers: {[key: string]: ReducerWithContext<S, any, any>} = {};

  Object.assign(actionCreatorPrototype, definition.actions);
  for (const name in definition.reducers) {
    const actionType = `${contextName}_${name}`;
    Object.assign(actionCreatorPrototype, {
      [name]: function (this: any, ...args: any[]) {
        return {
          type: actionType,
          args,
          context: this.actionContext
        }
      }
    });
    reducers[actionType] = (state, args, _context) => definition.reducers![name](state, ...args);
  }

  for (const name in definition.combines) {
    const rec = createImpl(
      definition.combines[name] as any,
      `${contextName}_${name}`,
    );
    Object.defineProperty(actionCreatorPrototype, name, {
      get: function (this: any) {
        return rec.createActionCreator(this.actionContext);
      }
    });
    Object.assign(reducers, mapValues(
      rec.reducers,
      (reducer: any) => (state: S, args: any, context: any) => {
        const resolved = (state as any)[name];
        const updated = reducer(resolved, args, context);
        return resolved === updated ? state : { ...state, [name]: updated};
      }
    ));
  }

  if (definition.list) {
    const listDefinition = definition.list!;

    const itemContextName = listDefinition.contextName || `${contextName}_item`;
    const itemDefinition = listDefinition.of;
    const keyOf = (selector: any | string ) => {
      return typeof selector === "string" ? selector : listDefinition.key(selector);
    };
    const findIndex = (state: any, ctx: any) => (state as unknown as any[]).findIndex(
      (i: any) => keyOf(i) == ctx[itemContextName]
    );

    const rec = createImpl(
      itemDefinition,
      `${contextName}_item`
    );
    Object.assign(reducers, mapValues(
      rec.reducers,
      (reducer: any) => (state: S, args: any[], context: any) => {
        const idx = findIndex(state, context);
        if (idx == -1) {
          warn(`Trying to perform action on element ${context[itemContextName]} of collection that does not contain it. The action will be ignored.`);
          return state;
        }
        const resolved = (state as any)[idx];
        const updated = reducer(resolved, args, context);
        if (updated === resolved) {
          return state;
        }
        const result = [...(state as unknown as any[])];
        result.splice(idx, 1, updated)
        return result as any;
      }
    ));

    Object.assign(actionCreatorPrototype, {
      $item: function (this: {actionContext: any}, selector: any) {
        return rec.createActionCreator({...this.actionContext, [itemContextName]: keyOf(selector)});
      }
    });
  }
  const createActionCreator = function (context: any) {
    const actionCreator = Object.create(actionCreatorPrototype);
    Object.assign(actionCreator, { actionContext: context});
    return actionCreator;
  }

  return { createActionCreator, reducers };
}

export const create = <S, A /* extends AnyActionCreators */>(definition: Definition<S,A>): {
  Actions: A,
  reduce: (state: S | undefined, action: {type: string }) => S
} => {
  const res = createImpl(definition, 'action');
  return {
    Actions: res.createActionCreator({}),
    reduce: (state = definition.default as S, action) => {
      // const nonEmptyState = state == undefined ? createDefault(definition) : state;
      return res.reducers[action.type] ?
        res.reducers[action.type](state, (action as any).args, (action as any).context) :
        state
    }
  };
}
