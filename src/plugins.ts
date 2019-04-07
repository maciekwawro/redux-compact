import { DefinitionBuilder } from '.';
import { warn } from './lib/util';

type ArrayElement<S> = S extends (infer T)[] ? T : never;
export const listReducers = <S extends any[] | undefined, A>(definition: DefinitionBuilder<S,A>) => {
  const keyOf = (selector: ArrayElement<S> | string) => {
    return typeof selector === "string" ? selector : definition.list!.key(selector);
  };

  return definition.addReducers({
    remove: (data: ArrayElement<S>[] | undefined, item: ArrayElement<S> | string) => {
      if (data == undefined) {
        warn('Trying to remove from collection that is undefined. The action will be ignored.');
        return data;
      }
      const index = data.findIndex((val: any) => keyOf(val) == keyOf(item));
      if (index == -1) {
        warn(`Trying to remove element ${keyOf(item)} from collection that does not contain it. The action will be ignored.`);
        return data;
      }
      const result = [...data];
      result.splice(index, 1);
      return result as any;
    },
    push: (data: ArrayElement<S>[] | undefined, item: ArrayElement<S>) => {
      if (data == undefined) {
        warn('Trying to push to collection that is undefined. The action will be ignored.');
        return data;
      }
      return [...data, item] as any;
    },
  });
}

export const replaceReducer = <S, A>(definition: DefinitionBuilder<S,A>) =>
  definition.addReducers({
    replace: (_data: S, replace: S) => replace,
  });

export const objectReducers = <S extends {} | undefined, A>(definition: DefinitionBuilder<S, A>) =>
  definition.addReducers({
    update: (data: S, update: Partial<S>) => {
      if (data == undefined) {
        warn('Trying to update object that is undefined. The action will be ignored.');
        return data;
      }
      return {...data, ...update};
    }
  });
