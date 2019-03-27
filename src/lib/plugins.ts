import { DefinitionWrapper } from './definition';

export const listReducers = <S>(wrapper: DefinitionWrapper<S>) => {
  const definition = wrapper.definition as any;

  const keyOf = (selector: any ) => {
    return typeof selector === "string" ? selector : definition.list.key(selector);
  };

  return wrapper.addReducers({
    remove: (data: any, item: any) => {
      const result = [...data];
      result.splice(data.findIndex((val: any) => keyOf(val) == keyOf(item)), 1);
      return result as any;
    },
    push: (data: any, item: any) => {
      return [...data, item] as any;
    },
    replace: (_data: any, items: any) => {
      return [...items] as any;
    }
  });
}

export const replaceReducer = <S>(wrapper: DefinitionWrapper<S>) =>
  wrapper.addReducers({
    replace: (_data: any, replace: any) => replace,
  });

export const objectReducers = <S>(wrapper: DefinitionWrapper<S>) =>
  wrapper.addReducers({
    update: (data: any, update: any) => ({...data, ...update})
  });
