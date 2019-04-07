import { AssertTrue, IsExact } from 'conditional-type-checks';
import { AnyAction } from 'redux';
import { definition, list, combine, create, StateOf } from '../';
import { replaceReducer } from '../plugins';

const nullableStringBasic = definition<string | undefined>().addReducers({
  wrap: (str: string | undefined, prefix: string, suffix: string) => `${prefix}${str}${suffix}`
});
const { Actions: BaseStringActions } = create(nullableStringBasic);

const reduxDefinition = combine({
  nullableString: nullableStringBasic.addActionCreators({
    wrapSymmetric: function(marker: string) {
      return this.wrap(marker, marker)
    },
  }),
  list: list({of: definition<number>().use(replaceReducer), key: String}).use(replaceReducer)
});
type AppState = StateOf<typeof reduxDefinition>;
const { reduce, Actions } = create(reduxDefinition);

test('types', () => {
  type TestState = AssertTrue<IsExact<AppState, {
    nullableString: string | undefined,
    list: number[]
  }>>;
  type TestReduce = AssertTrue<IsExact<typeof reduce, (state: AppState | undefined, action: AnyAction) => AppState>>;

  type ActionCreator<Args extends Array<any>> = (...args: Args) => { type: string, args: Args, context: any};
  type TestActions = AssertTrue<IsExact<typeof Actions, {
    actionContext: any,
    nullableString: {
      actionContext: any,
      wrap: ActionCreator<[string, string]>,
      wrapSymmetric: (this: typeof BaseStringActions, ...args: [string]) => { type: string, args: [string, string], context: any};
    },
    list: {
      actionContext: any,
      replace: ActionCreator<[number[]]>,
      $item: (item: string | number) => {
        actionContext: any,
        replace: ActionCreator<[number]>
      }
    }
  }>>;
});
