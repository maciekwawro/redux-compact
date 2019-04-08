import { DefinitionBuilder } from '.';
import { warn } from './lib/util';

type ArrayElement<S> = S extends (infer T)[] ? T : never;
export const listReducers = <
  S extends any[] | undefined | null,
  A extends { $item: (item: ArrayElement<S> | string) => any}, // created with list()
  H
>(definition: DefinitionBuilder<S,A,H>) => {
  const keyOf = (selector: ArrayElement<S> | string) => {
    return typeof selector === "string" ? selector : definition.list!.key(selector);
  };

  return definition.addReducers({
    remove: (data: ArrayElement<S>[] | undefined | null, item: ArrayElement<S> | string) => {
      if (data == undefined) {
        warn('Trying to remove from collection that is null or undefined. The action will be ignored.');
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

    pushOrReplace: (data: ArrayElement<S>[] | undefined | null, item: ArrayElement<S>) => {
      if (data == undefined) {
        warn('Trying to push to collection that is null or undefined. The action will be ignored.');
        return data;
      }
      const index = data.findIndex((val: any) => keyOf(val) == keyOf(item));
      if (index == -1) {
        return [...data, item] as any;
      }
      const result = [...data];
      result.splice(index, 1, item);
      return result;
    },
  });
}

export const setValueReducer = <S, A, H>(definition: DefinitionBuilder<S,A,H>) =>
  definition.addReducers({
    setValue: (_data: S, setValue: S) => setValue,
  });

export const objectReducers = <S extends {} | undefined, A,H>(definition: DefinitionBuilder<S, A,H>) =>
  definition.addReducers({
    update: (data: S, update: Partial<S>) => {
      if (data == undefined) {
        warn('Trying to update object that is undefined. The action will be ignored.');
        return data;
      }
      return {...data, ...update};
    }
  });
