import * as Schema from './schema';

export type ActionCreators<S /* extends Schema.Schema */> = {
  [K in keyof Schema.ReducerPayload<S>]: (payload: Schema.ReducerPayload<S>[K]) => {
    type: string,
    payload: Schema.ReducerPayload<S>[K],
    context: any,
  }
} & {
  [K in keyof Schema.Combines<S>]: ActionCreators<Schema.Combines<S>[K]>
} & ListActionCreators<S> & Schema.Actions<S> & {
  actionContext: {[key: string]: string}
};

type ListActionCreators<S /* extends Schema.Schema */> =
  [Schema.ListOf<S>] extends [never] ? {} :
  {
    (item: string | Schema.State<Schema.ListOf<S>>): ActionCreators<Schema.ListOf<S>>
  };
