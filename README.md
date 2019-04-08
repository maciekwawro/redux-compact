# redux-compact
There comes a time in every Redux user's life, when they have to define an action type and write an action creator just to pass data to the corresponding reducer. **redux-compact** removes the boilerplate: you define reducers, and get action creators generated for you. Additionally:
* if you use TypeScript, generated action creators will be fully typed - no redundant type definitions required;
* action creators' structure will correspond to the structure of the state;
* support for *directing* reducers towards particular item of the collection is out-of-the-box;
* simple plugin system allows you to easily add the same reducer / action creator to multiple pieces of data;
* **redux-compact** attempts at making as few assumptions as possible about what Redux middleware you're using.

**The project is in early beta and cannot be considered stable. All feedback is welcome. So are feature requests.**

## Table of contents

* [`redux-compact` vs vanilla Redux](#quick-example-redux-compact-vs-vanilla-redux)
* [Usage guide](#usage-guide)
  * [Install](#install)
  * [Basic usage](#basic-usage)
  * [About default values](#about-default-values)
  * [Composition](#composition)
    * [`combine(definitions: {[key: string]: Definition})`](#combinedefinitions-key-string-definition)
    * [`definition.defineSlice(property, Definition)`](#definitiondefinesliceproperty-definition)
  * [Collections](#collections)
    * [`list(config)`](#listconfig)
    * [`nullableList(config, default: null | undefined)`](#nullablelistconfig-default-null--undefined)
    * [`definition.use(listReducers)`](#definitionuselistreducers)
  * [Plugins](#plugins)
  * [Custom action creators](#custom-action-creators)
    * [`$context`](#context)

## Quick example: `redux-compact` vs vanilla Redux
*Note: All examples are using TypeScript, as it allows taking full advantage of `redux-compact` - generated action creators are fully typed. However, if you don't use TypeScript in your project, you may still want to give `redux-compact` a try :)*


### **redux-compact**:
#### Imports
```typescript
import { createStore, Store } from 'redux';
import { definition, list, create, combine, StateOf } from 'redux-compact';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
};
```
#### Definitions
```typescript
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
```
#### Usage
```typescript
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
```

### Vanilla Redux
#### Imports
```typescript
import { createStore, AnyAction, combineReducers, Store } from 'redux';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
};
```
#### Action types
```typescript
const ACTION_LOGGED_IN = 'ACTION_LOGGED_IN';
const ACTION_LOGGED_OUT = 'ACTION_LOGGED_OUT';
const ACTION_TODO_ADD = 'ACTION_TODO_ADD';
const ACTION_TODO_COMPLETED = 'ACTION_TODO_COMPLETED';
```
#### Action creators
```typescript
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
```
#### Reducers
```typescript
function accessToken(accessToken: string | null = null, action: AnyAction) {
  switch(action.type) {
    case ACTION_LOGGED_IN:
      return action.accessToken;
    case ACTION_LOGGED_OUT:
      return undefined;
    default:
      return accessToken;
  }
}

function todos(todos: Todo[] = [], action: AnyAction): Todo[] {
  switch(action.type) {
    case ACTION_TODO_ADD:
      return [...todos, action.todo];
    case ACTION_TODO_COMPLETED:
      const result = [...todos];
      const idx = result.findIndex(todo => todo.id == action.todoID);
      result[idx] = {...result[idx], completed: true};
      return result;
    default:
      return todos;
  }
}

const appState = combineReducers({accessToken, todos});
```
#### Usage
```typescript
interface AppState {
  accessToken?: string | null;
  todo: Todo[];
};

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
```
## Usage guide
### Install
`npm i --save redux-compact` or `yarn add redux-compact`

### Basic usage
Let's start simple and assume that your whole state is a counter. Start with importing relevant pieces from **redux-compact**:
```typescript
import { definition } from 'redux-compact';
```
Let's first define our data type and the default value:
```typescript
const counter = definition<number>().setDefault(0);
```
Now it's time to define the operations that you can perform on your piece of data:
```typescript
const counter = definition<number>().setDefault(0).addReducers({
  incrementBy: (state: number, by: number): number => state + by,
  decrementBy: (state: number, by: number): number => state - by,
  reset: (_state: number) => 0
});
```
**Important: Definitions are immutable, i.e. every call to `setDefault`, `addReducers` etc. creates a new one. TLDR DON'T do this:**
```typescript
const counter = definition<number>().setDefault(0);
counter.addReducers(...) // <-- this WILL NOT update counter
```
You can think of each value of the `addReducers` parameter as a single case in your regular-redux reducer. It should take the old state as a first argument, arbitrary number and types of other arguments, and return the new state following the usual redux immutability rule.

And... that's it. Let's create our store:
```typescript
import { create } from 'redux-compact';
import { createStore } from 'redux';
const { Actions, reduce } = create(counter);
const store = createStore(reduce);

// And for TypeScript fans...
import { StateOf } from 'redux-compact'
type AppState = StateOf<typeof counter>; // == number
```
For each reducer we defined, corresponding action creator was generated:
![](https://gist.githubusercontent.com/maciekwawro/3570b3fd31ad133155d8ba66e469c20d/raw/e7cf26f22064c0c5fc1489e378f657e49f59ddf0/img1.jpg)
Let's see the store in action:
```typescript
// Default value
expect(store.getState()).toEqual(0);

store.dispatch(Actions.incrementBy(3));
expect(store.getState()).toEqual(3);

store.dispatch(Actions.decrementBy(2));
expect(store.getState()).toEqual(1);

store.dispatch(Actions.reset());
expect(store.getState()).toEqual(0);
```
### About default values
There are two cases where `setDefault` call is relevant (and necessary):
* top-level definitions (inputs to `create()` function)
* definitions combined in the `combine()` function (see below).

### Composition
#### `combine(definitions: {[key: string]: Definition})`
Similarly to redux's `combineReducers()`, **redux-compact** provides `combine()` method:
```typescript
import { combine } from 'redux-compact';

const appState = combine({
  counter1: counter,
  counter2: counter
});
type AppState = StateOf<typeof appState>; // { counter1: number, counter2: number }
const { Actions, reduce } = create(appState);
const store = createStore(reduce);

expect(store.getState()).toEqual({counter1: 0, counter2: 0});

store.dispatch(Actions.counter1.incrementBy(3));
expect(store.getState()).toEqual({counter1: 3, counter2: 0});

store.dispatch(Actions.counter2.incrementBy(5));
expect(store.getState()).toEqual({counter1: 3, counter2: 5});
```
Note how `Actions` structure mirrors the `AppState` structure.

#### `definition.defineSlice(property, Definition)`

With **redux-compact**, it's also possible to take a hybrid approach where you treat the object as a whole, but at the same delegate changes of its property to another definition, using `defineSlice` method:
```typescript
type Player = {
  name: string;
  gamesPlayed: number
};

const player = definition<Player | null>().
  setDefault(null).
  addReducers({
    newPlayer: (_state: Player | null, name: string): Player => ({
      name,
      gamesPlayed: 0
    })
  }).
  defineSlice("gamesPlayed", counter);

const { reduce, Actions } = create(player);
const store = createStore(reduce);

expect(store.getState()).toEqual(null);

store.dispatch(Actions.newPlayer("Maciek"));
expect(store.getState()).toEqual({name: "Maciek", gamesPlayed: 0});

store.dispatch(Actions.gamesPlayed.incrementBy(1));
expect(store.getState()).toEqual({name: "Maciek", gamesPlayed: 1});

store.dispatch(Actions.newPlayer("Jagoda"));
expect(store.getState()).toEqual({name: "Jagoda", gamesPlayed: 0});
```
Note that `gamesPlayed` had to be defined in the `Player` type beforehand - the slice definitions add action creators for **existing** properties of the object. Similarly, **the default value of the `counter` definition is irrelevant in this case**.

### Collections

#### `list(config)`

For colections, **redux-compact** provides special kind of definitions that allow addresing the particular item of the collection with a user-friendly API. For example, let's imagine we want to have a collection of `Todo` objects, **uniquely defined by their `id`s**:

```typescript
interface Todo {
  id: string;
  text: string;
  completed: boolean;
};
```
First, let's define the definition for a single `Todo` object, like we previously did:
```typescript
import { definition } from 'redux-compact';

const todo = definition<Todo>().addReducers({
  setCompleted: (todo: Todo) => ({...todo, completed: true})
});
```
What we can now do, is to create a list of such objects:
```typescript
import { list } from 'redux-compact';

const todos = list({ of: todo, key: (todo: Todo) => todo.id});

import { StateOf } from 'redux-compact';
type Todos = StateOf<typeof todos>; // == Todo[]
```
The property `of` of the config is simply the definition for the item. `key` is a function that should return a string uniquely defining the `Todo` in the collection.

For completeness, let's add some collection-level reducer
```typescript
const todos = list({ of: todo, key: (todo: Todo) => todo.id})
  .addReducers({
    add: (todos: Todo[], todo: Todo) => [...todos, todo]
  });
```
and see how we can use it:
```typescript

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
```
#### `nullableList(config, default: null | undefined)`
If the state of the collection needs to allow `null` or `undefined` values, you can use `nullableList()` instead of `list()`. The second argument determines the state type for the definition:

```typescript
import { nullableList } from '../..';

const todosOrNull = nullableList({of: todo, key: todo => todo.id}, null);
// StateOf<typeof todosOrNull> == Todo[] | null;

const todosOrUndefned = nullableList({of: todo, key: todo => todo.id}, undefined);
// StateOf<typeof todosOrNull> == Todo[] | undefined;
```

#### `definition.use(listReducers)`

**redux-compact** provides a [plugin](#plugins) to add common reducers one might want to use with the `list()` definitions - no need to manually create the `add()` reducer like we did above.

```typescript
import { listReducers } from '../../plugins';

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
```
### Plugins
The easiest way to reuse reducers / action creators between different pieces of data, is to create a plugin that can apply the changes to the arbitrary definition. It can be as simple as:
```typescript
import { DefinitionBuilder } from 'redux-compact';

const setValueReducer = <State, ActionCreators, HasDefault>(
  definition: DefinitionBuilder<State,ActionCreators,HasDefault>
) => {
  return definition.addReducers({
    setValue: (_data: State, setValue: State) => setValue,
  });
}
```
and can be used with `definition.use(plugin)`:
```typescript
import { createStore } from 'redux';
import { create, definition } from 'redux-compact';

const counter = definition<number>().setDefault(0).use(setValueReducer);
const { Actions, reduce } = create(counter);
const store = createStore(reduce);

store.dispatch(Actions.setValue(7));
expect(store.getState()).toEqual(7);

```
Note that the `setValueReducer` is provided by `'redux-compact/plugins'`, along the others:

Plugin       | Action creator | Description
------------ | ---------------|-------------
`setValueReducer` | `setValue(value: State)` | Replaces the state with `value`
`objectReducers` | `update(values: Partial<State>)` | Merges `values` into state
`listReducers` | `pushOrReplace(item: Item)` | Appends the `item` to the state (which is a list). In case another item with the same key (see [collections](#collections)) is present, it is replaced by `item`.
&nbsp; | `remove(item: Item \| string)` | Given either an item or its key, it is removed from `state` (which is a list).

### Custom action creators

It is also possible to provide action creators that are not in 1:1 correspondence with reducers, using `definition.addActionCreators()`. See the example below:
```typescript
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
```
Note that `this` given to the custom action creator is an instance of `Actions` generated from this definition. It can use the reducers that were previously defined:

![](https://gist.github.com/maciekwawro/3570b3fd31ad133155d8ba66e469c20d/raw/a05672b9921728b69bac5abfa8df9df6fc280a4a/img2.jpg)

**Note: in order to use `this` like that, you need to use old-style function syntax (arrow functions prevent explicitly binding `this`)**

#### `$context`

Custom action creators can also leverage the [collections](#collections) API described above. For example, calling `Actions.todos.$item("3").completed.fetch()` exposes the key of the selected `todo` to the custom `fetch()` action creator. See example below:

```typescript
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
```
Use it like you would with the reducer-based action creators:
```typescript
const appState = combine({todos});
const { Actions, reduce } = create(appState);
const store = createStore(reduce);

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

```
