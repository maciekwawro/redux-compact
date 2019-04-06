export type Schema = {
  state: any,
  reducerPayload: {
    [key: string]: any
  },
  actions: {
    [key: string]: (...args: any[]) => any
  },
  combines: { [key: string]: Schema },
  listOf?: Schema,
};
export type State<S> = S extends { state: infer T } ? T : never;
export type ReducerPayload<S> = S extends { reducerPayload: infer T } ? T : never;
export type Actions<S> = S extends { actions: infer T } ? T : never;
export type Combines<S> = S extends { combines: infer T } ? T : never;
export type ListOf<S> = S extends { listOf: infer T } ? T: never;
