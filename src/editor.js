import Rx from 'rx';
import {h} from '@cycle/dom';
import Immutable from 'seamless-immutable';
import _ from 'lodash';

Rx.config.longStackSupport = true;

const {div, button} = require('hyperscript-helpers')(h);

function editorView () {
  return (
    div('.editor', [
      button('.record', 'Record')
    ])
  );
}

function finishRecording (state) {
  return Object.assign({}, state, {mode: 'editing'});
}

function startRecording (state) {
  return Object.assign({}, state, {mode: 'recording', animations: state.animations.concat([{actors: {}}])});
}

function moveActor (event) {
  return function updateActorPosition (actor) {
    return Immutable(Object.assign(actor.asMutable(), {position: {x: event.clientX, y: event.clientY}}))
  }
}

function justUpdateModelForTheSakeOfUpdating () {
  return function noop (actor) { return actor };
}

export function Actor ({DOM, props}, name) {
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

function updateActor (existingActorInAnimation, actorModel) {
  return existingActorInAnimation.concat([{
    position: actorModel.position
  }]);
}

function updateAnimation (animation, actorModel) {
  const getActor = actorModel => {
    return animation.actors && animation.actors[actorModel.name] || [];
  }
  const updatedActor = updateActor(getActor(actorModel), actorModel);

  return Object.assign({}, animation, {
    actors: Object.assign({}, animation.actors, {[actorModel.name]: updatedActor})
  });
}

function animationWaypoint (actorModel) {
  return function updateAnimationState (state) {
    if (state.animations.length === 0) {
      return state;
    }

    const updatedAnimation = updateAnimation(_.last(state.animations), actorModel);

    const animations = state.animations
      .slice(0, state.animations.length - 1)
      .concat([updatedAnimation]);

    return Object.assign({}, state, { animations });
  };
}

export default function editor ({DOM}) {
  const recording$ = DOM
    .select('.record')
    .events('click')
    .startWith(false)
    .scan((current, _) => !current);

  const changeMode$ = recording$.map(recording => ({
    true: startRecording,
    false: finishRecording
  }[recording]));

  const actors$ = Rx.Observable.just([
    Actor({DOM}, '0'),
    Actor({DOM}, '1'),
    Actor({DOM}, '2')
  ]);

  const animationWaypoint$ = actors$.flatMap(
    actors => Rx.Observable.merge(actors.map(actor => actor.model$)),
    (_, actorModel) => animationWaypoint(actorModel)
  );

  const action$ = changeMode$.merge(animationWaypoint$);

  const initialState = Immutable({
    mode: 'editing',
    animations: []
  });

  const state$ = action$
    .startWith(initialState)
    .scan((state, action) => action(state))
    .distinctUntilChanged(JSON.stringify);

  return {
    DOM: Rx.Observable.just(editorView()),
    state$,
    actors$
  };
}
