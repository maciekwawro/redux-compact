interface Todo {
  id: string;
  text: string;
  completed: boolean;
};

import { definition } from '../..';

const todo = definition<Todo>().addReducers({
  setCompleted: (todo: Todo) => ({...todo, completed: true})
});

import { list } from '../..';

const todos = list({ of: todo, key: (todo: Todo) => todo.id})
  .addReducers({
    add: (todos: Todo[], todo: Todo) => [...todos, todo]
  });

import { createStore } from 'redux';
import { create } from '../..';

test('test', () => {


const { Actions, reduce } = create(todos);
const store = createStore(reduce);

const todo1: Todo = { id: "1", text: "Test querying by key", completed: false };
const todo2: Todo = { id: "2", text: "Test querying by object", completed: false };

store.dispatch(Actions.add(todo1));
store.dispatch(Actions.add(todo2));
expect(store.getState()).toEqual([
  { id: "1", text: "Test querying by key", completed: false },
  { id: "2", text: "Test querying by object", completed: false }
]);

// We can select items by the key...
store.dispatch(Actions.$item("1").setCompleted());
expect(store.getState()).toEqual([
  { id: "1", text: "Test querying by key", completed: true },
  { id: "2", text: "Test querying by object", completed: false }
]);

// ...or by object (with the same key)
store.dispatch(Actions.$item(todo2).setCompleted());
expect(store.getState()).toEqual([
  { id: "1", text: "Test querying by key", completed: true },
  { id: "2", text: "Test querying by object", completed: true }
]);

});

import { nullableList } from '../..';

const todosOrNull = nullableList({of: todo, key: todo => todo.id}, null);
// StateOf<typeof todosOrNull> == Todo[] | null;

const todosOrUndefned = nullableList({of: todo, key: todo => todo.id}, undefined);
// StateOf<typeof todosOrNull> == Todo[] | undefined;

import { listReducers } from '../../plugins';

test('plugin', () => {

const todos = list({of: todo, key: todo => todo.id}).use(listReducers);
const { Actions, reduce } = create(todos);
const store = createStore(reduce);

const todo1: Todo = { id: "1", text: "Test querying by key", completed: false };
const todo2: Todo = { id: "2", text: "Test querying by object", completed: false };

store.dispatch(Actions.pushOrReplace(todo1));
store.dispatch(Actions.pushOrReplace(todo2));
expect(store.getState()).toEqual([todo1, todo2]);

// todo1 is already in the list
store.dispatch(Actions.pushOrReplace(todo1));
expect(store.getState()).toEqual([todo1, todo2]);

// remove object
store.dispatch(Actions.remove(todo1));
expect(store.getState()).toEqual([todo2]);

// remove by key
store.dispatch(Actions.remove("2"));
expect(store.getState()).toEqual([]);

})
