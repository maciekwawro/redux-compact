export const mapValues = <T,R>(input: {[key: string]: T}, fn: (val: T) => R): {[key: string]: R} => {
  const result: {[key: string]: R} = {};
  for (const key in input) {
    result[key] = fn(input[key]);
  }
  return result;
}
