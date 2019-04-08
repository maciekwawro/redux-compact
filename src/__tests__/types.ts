import { AssertTrue, IsExact } from 'conditional-type-checks';
import { AnyAction } from 'redux';
import { definition, list, combine, create, StateOf, nullableList } from '../';
import { setValueReducer } from '../plugins';

const nullableStringBasic = definition<string | undefined>().setDefault(undefined).addReducers({
  wrap: (str: string | undefined, prefix: string, suffix: string) => `${prefix}${str}${suffix}`
});
const { Actions: BaseStringActions } = create(nullableStringBasic);

const reduxDefinition = combine({
  nullableString: nullableStringBasic.addActionCreators({
    wrapSymmetric: function(marker: string) {
      return this.wrap(marker, marker)
    },
  }),
  list: list({of: definition<number>().use(setValueReducer), key: String}).use(setValueReducer),
  nullableList: nullableList({of: definition<{id: string}>(), key: o => o.id}, null),
});
type AppState = StateOf<typeof reduxDefinition>;
const { reduce, Actions } = create(reduxDefinition);

test('types', () => {
  type TestState = AssertTrue<IsExact<AppState, {
    nullableString: string | undefined,
    list: number[],
    nullableList: {id: string}[] | null
  }>>;
  type TestReduce = AssertTrue<IsExact<typeof reduce, (state: AppState | undefined, action: AnyAction) => AppState>>;

  type ActionCreator<Args extends Array<any>> = (...args: Args) => { type: string, args: Args, context: any};
  type TestActions = AssertTrue<IsExact<typeof Actions, {
    $context: any,
    nullableString: {
      $context: any,
      wrap: ActionCreator<[string, string]>,
      wrapSymmetric: (this: typeof BaseStringActions, ...args: [string]) => { type: string, args: [string, string], context: any};
    },
    list: {
      $context: any,
      setValue: ActionCreator<[number[]]>,
      $item: (item: string | number) => {
        $context: any,
        setValue: ActionCreator<[number]>
      }
    },
    nullableList: {
      $context: any,
      $item: (item: {id: string} | string) => {
        $context: any
      }
    }
  }>>;
});
