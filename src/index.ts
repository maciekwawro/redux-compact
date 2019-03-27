export { definition, list, combine } from './lib/definition';
export { create } from './lib/create';

import { DefinitionWrapper } from './lib/definition';
import { State } from './lib/create';

export type State<D> = D extends DefinitionWrapper<infer S> ? State<S> : never;
