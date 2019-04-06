import { createStore, Store } from 'redux';

import { definition, list, combine, create, State } from '../';
import { listReducers, replaceReducer, objectReducers } from '../lib/plugins';

type Todo = {
  id: string,
  text: string,
  completed: boolean
};

type Comment = {
  id: string,
  message: string,
};

const accessToken = definition<string | undefined>();
const visibilityFilter = definition<'SHOW_ALL' | 'SHOW_OPEN'>('SHOW_ALL').use(replaceReducer);

const comment = definition<Comment>().use(objectReducers);
const comments = list(comment, c => c.id).use(listReducers).addActionCreators({
  fetch: function(dataSource: (todoID: string) => Comment[]) {
    return this.replace(dataSource(this.actionContext.todos));
  }
});
const todo = definition<Todo>().
  combineWith({comments}).
  addReducers({
    setCompleted: (t: Todo, completed: boolean) => ({...t, completed}),
  });
const todos = list(todo, t => t.id, []).use(listReducers).addActionCreators({
  fetch: function (dataSource: () => Todo[]) {
    return this.replace(dataSource());
  }
});

const reduxDefinition = combine({
  accessToken,
  visibilityFilter,
  todos
});

const { reduce, Actions } = create(reduxDefinition);
describe('Action shapes', () => {
  test('top-level replace', () => {
    const action = Actions.visibilityFilter.replace("SHOW_OPEN");
    expect(action).toEqual({
      type: "actions_visibilityFilter_replace",
      payload: "SHOW_OPEN",
      context: {}
    });
  });
  test('list item custom reducer', () => {
    const action = Actions.todos("4").setCompleted(true);
    expect(action).toEqual({
      type: "actions_todos_item_setCompleted",
      payload: true,
      context: {
        todos: "4"
      }
    });
  });
  test('nested list item update', () => {
    const action = Actions.todos("4").comments("5").update({message: "Test"});
    expect(action).toEqual({
      type: "actions_todos_item_comments_item_update",
      payload: {
        message: "Test"
      },
      context: {
        todos: "4",
        comments: "5"
      }
    });
  });
});

describe('Basic', () => {
  const store: Store<State<typeof reduxDefinition>> = createStore(reduce);

  test('default state', () => {
    expect(store.getState()).toEqual({
      accessToken: undefined,
      visibilityFilter: 'SHOW_ALL',
      todos: []
    });
  });
  test('replace action reducer', () => {
    store.dispatch(Actions.visibilityFilter.replace("SHOW_OPEN"));
    expect(store.getState()).toEqual({
      accessToken: undefined,
      visibilityFilter: 'SHOW_OPEN',
      todos: []
    });
  })
  // test('nested')
});
describe('Lists', () => {
  const store: Store<State<typeof reduxDefinition>> = createStore(reduce);

  const tasks = [
    {id: "4", text: "Test things", completed: false},
    {id: "5", text: "Test more", completed: false},
    {id: "6", text: "Test even more", completed: false},
  ];

  test('push', () => {
    store.dispatch(Actions.todos.push(tasks[0]));
    expect(store.getState().todos).toEqual([tasks[0]]);
    store.dispatch(Actions.todos.push(tasks[1]));
    expect(store.getState().todos).toEqual(tasks.slice(0,2));
    store.dispatch(Actions.todos.push(tasks[2]));
    expect(store.getState().todos).toEqual(tasks.slice(0,3));
  });

  test('updateItem', () => {
    store.dispatch(Actions.todos("6").setCompleted(true));
    expect(store.getState().todos).toEqual([tasks[0], tasks[1], {...tasks[2], completed: true}]);
    store.dispatch(Actions.todos(tasks[2]).setCompleted(false));
    expect(store.getState().todos).toEqual(tasks.slice(0,3));
  });

  test('remove', () => {
    store.dispatch(Actions.todos.remove("5"));
    expect(store.getState().todos).toEqual([tasks[0], tasks[2]]);
    store.dispatch(Actions.todos.remove(tasks[2]));
    expect(store.getState().todos).toEqual([tasks[0]]);
  });
});

describe('Nested lists', () => {
  const store: Store<State<typeof reduxDefinition>> = createStore(reduce);

  const tasks = [
    {id: "4", text: "Test things", completed: false},
    {id: "5", text: "Test more", completed: false},
    {id: "6", text: "Test even more", completed: false},
  ];

  beforeAll(() => {
    store.dispatch(Actions.todos.push(tasks[0]));
    store.dispatch(Actions.todos.push(tasks[1]));
    expect(store.getState().todos).toEqual(tasks.slice(0,2));
  })

  test('replace', () => {
    expect(store.getState().todos).toEqual(tasks.slice(0,2));
    store.dispatch(Actions.todos("4").comments.replace([]));
    expect(store.getState().todos).toEqual([{...tasks[0], comments: []}, tasks[1]]);
  });

  test('push', () => {
    store.dispatch(Actions.todos("4").comments.push({id: "6", message: "Hello"}));
    expect(store.getState().todos).toEqual([{...tasks[0], comments: [{id: "6", message: "Hello"}]}, tasks[1]]);
  });

  test('update', () => {
    store.dispatch(Actions.todos("4").comments("6").update({message: "Hi"}));
    expect(store.getState().todos).toEqual([{...tasks[0], comments: [{id: "6", message: "Hi"}]}, tasks[1]]);
  });

});

describe('Custom actions', () => {
  const store: Store<State<typeof reduxDefinition>> = createStore(reduce);
  const tasks = [
    {id: "4", text: "Test things", completed: false},
    {id: "5", text: "Test more", completed: false},
    {id: "6", text: "Test even more", completed: false},
  ];

  test('basic', () => {
    Actions.todos.fetch(() => tasks.slice(0,2));
    store.dispatch(Actions.todos.fetch(() => tasks.slice(0,2)));
    expect(store.getState().todos).toEqual(tasks.slice(0,2));
  });

  test('nested', () => {
    const commentDataSource = (id: string): Comment[] => [
      {id: `${id}_1`, message: `I like to ${tasks.find(t => t.id == id)!.text.toLowerCase()}`}
    ];
    store.dispatch(Actions.todos("4").comments.fetch(commentDataSource));
    expect(store.getState().todos).toEqual([
      {
        ...tasks[0],
        comments: [{id: "4_1", message: "I like to test things"}]
      },
      tasks[1]
    ]);

    store.dispatch(Actions.todos("5").comments.fetch(commentDataSource));
    expect(store.getState().todos).toEqual([
      {
        ...tasks[0],
        comments: [{id: "4_1", message: "I like to test things"}]
      },
      {
        ...tasks[1],
        comments: [{id: "5_1", message: "I like to test more"}]
      }
    ]);
  });
});
