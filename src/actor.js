import Rx from 'rx';
import {h} from '@cycle/dom';
import Immutable from 'seamless-immutable';
import _ from 'lodash';

function moveActor (event) {
  return function updateActorPosition (actor) {
    return Immutable(Object.assign(actor.asMutable(), {position: {x: event.clientX, y: event.clientY}}))
  }
}

function justUpdateModelForTheSakeOfUpdating () {
  return function noop (actor) { return actor };
}

export default function Actor ({DOM, props}, name) {
  const actorDOM = DOM.select(`.actor-${name}`);
  const initialState = Immutable({position: {x: 150, y: 150}, name});

  const mousedown$ = actorDOM.events('mousedown');
  const mousemove$ = actorDOM.events('mousemove');
  const mouseup$ = actorDOM.events('mouseup');

  const selected$ = Rx.Observable.merge(
    mousedown$.map(_ => true),
    mouseup$.map(_ => false)
  ).startWith(false);

  const action$ = Rx.Observable.merge(
    whileSelected$(selected$, mousemove$).map(moveActor),
    mousedown$.map(justUpdateModelForTheSakeOfUpdating)
  );

  function whileSelected$ (selected$, stream$) {
    return stream$.withLatestFrom(selected$)
      .filter(([_, selected], __) => selected)
      .map(([event, selected]) => event);
  }

  const model$ = action$
    .startWith(initialState)
    .scan((state, action) => action(state));

  return {
    DOM: Rx.Observable.just(h('.actor .actor-' + name, 'hey')),
    model$
  };
}

