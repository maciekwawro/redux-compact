export const mapValues = <K extends string,T,R>(input: Record<K,T>, fn: (val: T) => R): Record<K,R> => {
  const result: Record<K,R> = {} as Record<K,R>;
  for (const key in input) {
    result[key] = fn(input[key]);
  }
  return result;
}

let warn = (_message: string) => {};
if (process.env.NODE_ENV !== 'production' && typeof console !== 'undefined') {
  warn = (message: string) => {
    console.error(`[redux-compact][warning] ${message}`)
  };
}
export { warn };
