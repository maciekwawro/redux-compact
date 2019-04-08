import { definition } from '../..';

const counter = definition<number>().setDefault(0).addReducers({
  incrementBy: (state: number, by: number): number => state + by,
  decrementBy: (state: number, by: number): number => state - by,
  reset: (_state: number) => 0
});

import { create } from '../..';
import { createStore } from 'redux';
const { Actions, reduce } = create(counter);
const store = createStore(reduce);

// And for TypeScript fans...
import { StateOf } from '../..'
type AppState = StateOf<typeof counter>; // == number

test('test', () => {

// Default value
expect(store.getState()).toEqual(0);

store.dispatch(Actions.incrementBy(3));
expect(store.getState()).toEqual(3);

store.dispatch(Actions.decrementBy(2));
expect(store.getState()).toEqual(1);

store.dispatch(Actions.reset());
expect(store.getState()).toEqual(0);

});

import { combine } from '../..';

test('combine', () => {

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

});

test('hybrid', () => {

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

});
