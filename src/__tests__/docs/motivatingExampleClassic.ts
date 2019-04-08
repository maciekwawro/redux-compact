import { createStore, AnyAction, combineReducers, Store } from 'redux';

/**
 * Interfaces
 */
interface Todo {
  id: string;
  text: string;
  completed: boolean;
};

interface AppState {
  accessToken?: string | null;
  todo: Todo[];
};

/**
 * Action types
 */
const ACTION_LOGGED_IN = 'ACTION_LOGGED_IN';
const ACTION_LOGGED_OUT = 'ACTION_LOGGED_OUT';
const ACTION_TODO_ADD = 'ACTION_TODO_ADD';
const ACTION_TODO_COMPLETED = 'ACTION_TODO_COMPLETED';

/**
 * Action creators
 */
function loggedIn(accessToken: string) {
  return {
    type: ACTION_LOGGED_IN,
    accessToken
  };
};

function loggedOut() {
  return {
    type: ACTION_LOGGED_OUT,
  }
}

function addTodo(todo: Todo) {
  return {
    type: ACTION_TODO_ADD,
    todo
  }
}

function todoCompleted(todoID: string) {
  return {
    type: ACTION_TODO_COMPLETED,
    todoID
  }
}

/**
 * Reducers
 */
function accessToken(state: string | null = null, action: AnyAction) {
  switch(action.type) {
    case ACTION_LOGGED_IN:
      return action.accessToken;
    case ACTION_LOGGED_OUT:
      return null;
    default:
      return state;
  }
}

function todos(state: Todo[] = [], action: AnyAction): Todo[] {
  switch(action.type) {
    case ACTION_TODO_ADD:
      return [...state, action.todo];
    case ACTION_TODO_COMPLETED:
      const result = [...state];
      const idx = result.findIndex(todo => todo.id == action.todoID);
      result[idx] = {...result[idx], completed: true};
      return result;
    default:
      return state;
  }
}

const appState = combineReducers({accessToken, todos});

/**
 * Usage
 */
test('test', () => {

const store: Store<AppState> = createStore(appState);
store.dispatch(loggedIn('access-token'));
store.dispatch(addTodo({id: "1", text: 'Add action types', completed: false}));
store.dispatch(addTodo({id: "2", text: 'Add action creators', completed: false}));
store.dispatch(addTodo({id: "3", text: 'Add reducers', completed: false}));
store.dispatch(todoCompleted("1"));

expect(store.getState()).toEqual({
  accessToken: 'access-token',
  todos: [
    {id: "1", text: "Add action types", completed: true},
    {id: "2", text: "Add action creators", completed: false},
    {id: "3", text: "Add reducers", completed: false},
  ]
});

});
