import { Definition, ActionCreatorsBase } from './definition';
import { mapValues, warn } from './util';

type ReducerWithContext<S,Args> = (state: S, args: Args, context: {[key: string]: string}) => S;

const createImpl = <S, A>(
  definition: Definition<S,A, any>,
  contextName: string,
): {
  createActionCreator: ((ctx: any) => A),
  reducers: {[key: string]: ReducerWithContext<S, any>}
} => {
  const actionCreatorPrototype = {};
  const reducers: {[key: string]: ReducerWithContext<S, any>} = {};

  Object.assign(actionCreatorPrototype, definition.actions);
  for (const name in definition.reducers) {
    const actionType = `${contextName}_${name}`;
    Object.assign(actionCreatorPrototype, {
      [name]: function (this: ActionCreatorsBase, ...args: any[]) {
        return {
          type: actionType,
          args,
          context: this.$context
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
      get: function (this: ActionCreatorsBase) {
        return rec.createActionCreator(this.$context);
      }
    });
    Object.assign(reducers, mapValues(
      rec.reducers,
      (reducer: any) => (state: S, args: any, context: any) => {
        if (state == null) {
          warn(`Trying to perform action on slice ${name} of object that is null or undefined. The action will be ignored.`);
          return state;
        }

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
        if (!state) {
          warn(`Trying to perform action on element ${context[itemContextName]} of collection that is null or undefined. The action will be ignored.`);
          return state;
        }
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
      $item: function (this: ActionCreatorsBase, selector: any) {
        return rec.createActionCreator({...this.$context, [itemContextName]: keyOf(selector)});
      }
    });
  }
  const createActionCreator = function (context: any) {
    const actionCreator = Object.create(actionCreatorPrototype);
    Object.assign(actionCreator, { $context: context});
    return actionCreator;
  }

  return { createActionCreator, reducers };
}

export const create = <S, A /* extends AnyActionCreators */>(definition: Definition<S,A,true>): {
  Actions: A,
  reduce: (state: S | undefined, action: {type: string }) => S
} => {
  const res = createImpl(definition, 'action');
  return {
    Actions: res.createActionCreator({}),
    reduce: (state = definition.default, action) => {
      // const nonEmptyState = state == undefined ? createDefault(definition) : state;
      return res.reducers[action.type] ?
        res.reducers[action.type](state, (action as any).args, (action as any).context) :
        state
    }
  };
}
