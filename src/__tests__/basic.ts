import { createStore, Store } from 'redux';

import { definition, list, combine, create, StateOf } from '../';
import { listReducers, replaceReducer, objectReducers } from '../plugins';

type Todo = {
  id: string,
  text: string,
  completed: boolean,
  comments?: Comment[],
};

type Comment = {
  id: string,
  message: string,
};

const accessToken = definition<string | undefined>();
const visibilityFilter = definition<'SHOW_ALL' | 'SHOW_OPEN'>('SHOW_ALL').use(replaceReducer);

const comment = definition<Comment>().use(objectReducers).addReducers({
  wrap: (comment, prefix: string, suffix: string) => ({
    ...comment,
    message: `${prefix}${comment.message}${suffix}`
  })
});
const comments = list({of: comment, key: c => c.id}).use(listReducers).use(replaceReducer).addActionCreators({
  fetch: function(dataSource: (todoID: string) => Comment[]) {
    return this.replace(dataSource(this.actionContext.todo));
  }
});

const todo = definition<Todo>().
  defineSlice("comments", comments).
  addReducers({
    setCompleted: (t: Todo, completed: boolean) => ({...t, completed}),
  });
const todos = list({of: todo, key: t => t.id, contextName: 'todo'}, []).use(listReducers).use(replaceReducer).addActionCreators({
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
      type: "action_visibilityFilter_replace",
      args: ["SHOW_OPEN"],
      context: {}
    });
  });
  test('list item custom reducer', () => {
    const action = Actions.todos.$item("4").setCompleted(true);
    expect(action).toEqual({
      type: "action_todos_item_setCompleted",
      args: [true],
      context: {
        todo: "4"
      }
    });
  });
  test('nested list item update', () => {
    const action = Actions.todos.$item("4").comments.$item("5").update({message: "Test"});
    expect(action).toEqual({
      type: "action_todos_item_comments_item_update",
      args: [{
        message: "Test"
      }],
      context: {
        todo: "4",
        action_todos_item_comments_item: "5"
      }
    });
  });
  test('nested list item multiarg', () => {
    const action = Actions.todos.$item("4").comments.$item("5").wrap("[ ", " ]");
    expect(action).toEqual({
      type: "action_todos_item_comments_item_wrap",
      args: ["[ "," ]"],
      context: {
        todo: "4",
        action_todos_item_comments_item: "5"
      }
    });
  });
});

describe('Basic', () => {
  const store: Store<StateOf<typeof reduxDefinition>> = createStore(reduce);

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
  const store: Store<StateOf<typeof reduxDefinition>> = createStore(reduce);

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
    store.dispatch(Actions.todos.$item("6").setCompleted(true));
    expect(store.getState().todos).toEqual([tasks[0], tasks[1], {...tasks[2], completed: true}]);
    store.dispatch(Actions.todos.$item(tasks[2]).setCompleted(false));
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
  const store: Store<StateOf<typeof reduxDefinition>> = createStore(reduce);

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
    // store.dispatch(Actions.todos.$item("4").comments.remove("3"));
    // store.dispatch(Actions.todos.$item("4").comments.push({id: "1", message: "Hi"}));
    store.dispatch(Actions.todos.$item("4").comments.replace([]));
    // store.dispatch(Actions.todos.$item("4").comments.remove("3"));
    expect(store.getState().todos).toEqual([{...tasks[0], comments: []}, tasks[1]]);
  });

  test('push', () => {
    store.dispatch(Actions.todos.$item("4").comments.push({id: "6", message: "Hello"}));
    expect(store.getState().todos).toEqual([{...tasks[0], comments: [{id: "6", message: "Hello"}]}, tasks[1]]);
  });

  test('update', () => {
    store.dispatch(Actions.todos.$item("4").comments.$item("6").update({message: "Hi"}));
    expect(store.getState().todos).toEqual([{...tasks[0], comments: [{id: "6", message: "Hi"}]}, tasks[1]]);
  });

});

describe('Custom actions', () => {
  const store: Store<StateOf<typeof reduxDefinition>> = createStore(reduce);
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
    store.dispatch(Actions.todos.$item("4").comments.fetch(commentDataSource));
    expect(store.getState().todos).toEqual([
      {
        ...tasks[0],
        comments: [{id: "4_1", message: "I like to test things"}]
      },
      tasks[1]
    ]);

    store.dispatch(Actions.todos.$item("5").comments.fetch(commentDataSource));
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

  test('multi-arg', () => {
    store.dispatch(Actions.todos.remove("4"));
    store.dispatch(Actions.todos.$item("5").comments.$item("5_1").wrap("[ ", " ]"));
    expect(store.getState().todos).toEqual([
      {
        ...tasks[1],
        comments: [{id: "5_1", message: "[ I like to test more ]"}]
      }
    ]);
  });
});
