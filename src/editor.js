import Rx from 'rx';
import {h} from '@cycle/dom';
import Immutable from 'seamless-immutable';

Rx.config.longStackSupport = true;

const {div, button} = require('hyperscript-helpers')(h);

function editorView () {
  return (
    div('.editor', [
      div('.actor', 'hey'),
      div('.actor', 'hey'),
      div('.actor', 'hey'),
      button('.record', 'Record')
    ])
  );
}

function finishRecording (state) {
  const animation = {
    start: 250,
    end: 500,
    actors: {
      '0': [
      {
        frame: 250,
        position: {
          x: 150,
          y: 150
        }
      },
      {
        frame: 400,
        position: {
          x: 200,
          y: 300
        }
      }
      ]
    }
  }

  return Object.assign({}, state, {mode: 'editing', animations: state.animations.concat([animation])});
}

function startRecording (state) {
  return Object.assign({}, state, {mode: 'recording'});
}

function changeMode (mode) {
  return state => {
    if (state.mode === 'recording' && mode === 'recording') {
      return finishRecording(state);
    }

    return startRecording(state);
  };
}

export function Actor ({DOM, props}, name) {
  const actorDOM = DOM.select(name);
  const initialState = Immutable({position: {x: 150, y: 150}});

  const mousedown$ = actorDOM.events('mousedown');
  const mousemove$ = actorDOM.events('mousemove');
  const mouseup$ = actorDOM.events('mouseup');

  const selected$ = Rx.Observable.merge(
    mousedown$.map(_ => true),
    mouseup$.map(_ => false)
  );

  const mouseMoveWhileSelected$ = mousemove$.pausable(selected$);

  const model$ = mouseMoveWhileSelected$
    .map(event => Immutable({position: {x: event.clientX, y: event.clientY}}))
    .startWith(initialState);

  return {
    DOM: Rx.Observable.just(h('.actor ' + name, 'hey')),
    model$
  };
}

export default function editor ({DOM}) {
  const changeMode$ = DOM
    .select('.record')
    .events('click')
    .map(_ => 'recording')
    .map(changeMode);

  const action$ = changeMode$;

  const initialState = Immutable({
    mode: 'editing',
    animations: []
  });

  const actors$ = Rx.Observable.just([
    Actor({DOM}, '0'),
    Actor({DOM}, '1'),
    Actor({DOM}, '2')
  ]);

  const state$ = action$
    .startWith(initialState)
    .scan((state, action) => action(state));

  return {
    DOM: Rx.Observable.just(editorView()),
    state$,
    actors$
  };
}
