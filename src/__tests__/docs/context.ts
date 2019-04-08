import { definition, list, combine, create } from '../..';
import { listReducers, setValueReducer } from '../../plugins';
import { createStore } from 'redux';

type Todo = {
  id: string;
  text: string;
  completed?: boolean;
};

const tasksCompletedDataSource: {[key: string]: boolean | undefined} = {};
const completed = definition<boolean | undefined>().use(setValueReducer).addActionCreators({
  fetch: function() {
     // IMPORTANT: property name 'todo' comes from the list definition below
    const todoID = this.$context.todo;
    return this.setValue(tasksCompletedDataSource[todoID]);
  }
});

const todo = definition<Todo>().defineSlice("completed", completed);
const todos = list({
  of: todo,
  key: todo => todo.id,
  // IMPORTANT: This is the context key that the reducers can use
  contextName: 'todo',
}).use(listReducers);

const appState = combine({todos});
const { Actions, reduce } = create(appState);
const store = createStore(reduce);

test('test', () => {

const task1 = {id: "1", text: "Test with key"};
const task2 = {id: "2", text: "Test with object"};

store.dispatch(Actions.todos.pushOrReplace(task1));
store.dispatch(Actions.todos.pushOrReplace(task2));

tasksCompletedDataSource["1"] = true;
tasksCompletedDataSource["2"] = false;

store.dispatch(Actions.todos.$item("1").completed.fetch());
expect(store.getState()).toEqual({
  todos: [
    {id: "1", text: "Test with key", completed: true},
    {id: "2", text: "Test with object"}
  ]
});

store.dispatch(Actions.todos.$item(task2).completed.fetch());
expect(store.getState()).toEqual({
  todos: [
    {id: "1", text: "Test with key", completed: true},
    {id: "2", text: "Test with object", completed: false}
  ]
});

});
