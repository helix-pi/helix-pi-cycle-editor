import Rx from 'rx';
import {svg} from '@cycle/dom';
import Immutable from 'seamless-immutable';
import _ from 'lodash';

function moveActor (event) {
  return function updateActorPosition (actor) {
    return Immutable(Object.assign(actor.asMutable(), {position: {x: event.clientX, y: event.clientY}}));
  };
}

function justUpdateModelForTheSakeOfUpdating () {
  return function noop (actor) { return actor };
}

function styles (model) {
  return {
    position: 'absolute',
    x: `${model.position.x}px`,
    y: `${model.position.y}px`,
    width: '20px',
    height: '80px',
    'xlink:href': model.imagePath,
    'class': `.actor .actor-${model.name}`
  };
}

function view (model) {
  const style = styles(model);

  return (
    svg(`image`, style)
  );
}

export default function Actor ({DOM, props}, name) {
  const actorDOM = DOM.select(`.actor-${name}`);
  const initialState = {position: {x: 150, y: 150}, name};

  const mousedown$ = DOM.select('svg').events('mousedown')
    .do(ev => ev.preventDefault())
    .filter(ev => _.includes(ev.target.classList, `.actor-${name}`));
  const mousemove$ = DOM.select('.app').events('mousemove');
  const mouseup$ = DOM.select('.app').events('mouseup');

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
    .startWith(Immutable(Object.assign({}, initialState, props)))
    .scan((state, action) => action(state));

  return {
    DOM: model$.map(view),
    model$
  };
}

