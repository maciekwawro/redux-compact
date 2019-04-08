import { definition, list, create, combine, StateOf } from '../../';
import { createStore, Store } from 'redux';


/**
 * Interfaces
 */
interface Todo {
  id: string;
  text: string;
  completed: boolean;
};

/**
 * Definitions
 */
const accessToken = definition<string | null>().setDefault(null).addReducers({
  loggedIn: (_state: string | null, accessToken: string) => accessToken,
  loggedOut: (_state: string | null) => null
});

const todo = definition<Todo>().addReducers({
  setCompleted: (todo: Todo) => ({...todo, completed: true})
});

const todos = list({ of: todo, key: todo => todo.id}).addReducers({
  add: (todos: Todo[], todo: Todo) => [...todos, todo]
});

const appState = combine({
  accessToken,
  todos
});

/**
 * Usage
 */
test('test', () => {

const { Actions, reduce } = create(appState);
type AppState = StateOf<typeof appState>;

const store: Store<AppState> = createStore(reduce);
store.dispatch(Actions.accessToken.loggedIn('access-token'));
store.dispatch(Actions.todos.add({id: "1", text: 'Add action types', completed: false}));
store.dispatch(Actions.todos.add({id: "2", text: 'Add action creators', completed: false}));
store.dispatch(Actions.todos.add({id: "3", text: 'Add reducers', completed: false}));
store.dispatch(Actions.todos.$item("1").setCompleted());

expect(store.getState()).toEqual({
  accessToken: 'access-token',
  todos: [
    {id: "1", text: "Add action types", completed: true},
    {id: "2", text: "Add action creators", completed: false},
    {id: "3", text: "Add reducers", completed: false},
  ]
});

});
