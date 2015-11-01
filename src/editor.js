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

function changeMode (mode) {
  return state => {
    if (state.mode === 'recording' && mode === 'recording') {
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
              frame: 350,
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

    return Object.assign({}, state, {mode});
  };
}

export default function editor ({DOM}) {
  const enterRecordMode$ = DOM
    .select('.record')
    .events('click')
    .map(_ => 'recording')
    .map(changeMode);

  const action$ = enterRecordMode$;

  const initialState = Immutable({
    mode: 'editing',
    animations: []
  });

  const state$ = action$
    .startWith(initialState)
    .scan((state, action) => action(state));

  return {
    DOM: Rx.Observable.just(editorView()),
    state$
  };
}
