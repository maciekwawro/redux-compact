export type SliceResolver = {
  type: "slice",
  slice: string
};
export type Resolver = SliceResolver;
const isSliceResolver = (resolver: Resolver): resolver is SliceResolver => resolver.type == "slice";

export function reduce<A,S>(
  state: any,
  action: A,
  reducer: (state: S, action: A) => S,
  resolvers: Resolver[],
): any {
  const [resolver, ...tailReducers] = resolvers;
  if (!resolver) {
    return reducer(state, action);
  }
  if (isSliceResolver(resolver)) {
    const rec = reduce(state[resolver.slice], action, reducer, tailReducers);
    return {
      ...state,
      [resolver.slice]: rec
    };
  }
  //  else if (isListItem(resolver)) {
  //   const idx = state.findIndex(resolver.withContext(action.context));
  //   const rec = reduce(state[idx], action, reducer, resolvers);
  //   const res = [...state];
  //   return res.splice(idx, 1, rec);
  // } else if (isMapItem(resolver)) {
  //   const rec = reduce(state[resolver.key], action, reducer, resolvers);
  //   return {
  //     ...state,
  //     [resolver.key]: rec
  //   };
  // }
}
