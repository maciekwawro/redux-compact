import { DefinitionBuilder } from '../..';

const setValueReducer = <State, ActionCreators, HasDefault>(
  definition: DefinitionBuilder<State,ActionCreators,HasDefault>
) => {
  return definition.addReducers({
    setValue: (_data: State, setValue: State) => setValue,
  });
}

import { createStore } from 'redux';
import { create, definition } from '../..';

test('plugins', () => {

const counter = definition<number>().setDefault(0).use(setValueReducer);
const { Actions, reduce } = create(counter);
const store = createStore(reduce);

store.dispatch(Actions.setValue(7));
expect(store.getState()).toEqual(7);

})

test('custom action creators', () => {

const counter = definition<number>().setDefault(0).use(setValueReducer).addActionCreators({
  reset: function () {
    return this.setValue(0);
  }
});
const { Actions, reduce } = create(counter);
const store = createStore(reduce);

store.dispatch(Actions.setValue(7));
expect(store.getState()).toEqual(7);

store.dispatch(Actions.reset());
expect(store.getState()).toEqual(0);


})
