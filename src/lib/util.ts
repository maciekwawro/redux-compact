export const mapValues = <K extends string,T,R>(input: {[key in K]: T}, fn: (val: T) => R): {[key in K]: R} => {
  const result: {[key in K]: R} = {} as any;
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
