import Rx from 'rx';
import {h, svg} from '@cycle/dom';
import Immutable from 'seamless-immutable';
import _ from 'lodash';

Rx.config.longStackSupport = true;

import hyperScriptHelpers from 'hyperscript-helpers';

const {div, button} = hyperScriptHelpers(h);

import Actor from './actor';

function svgStyle () {
  return {
    width: '100%',
    height: '100%'
  };
}

function pathFromState (state) {
  const lastAnimation = _.last(state.animations);

  if (lastAnimation && lastAnimation.actors && lastAnimation.actors['0'] && lastAnimation.actors['0'].length > 0) {
    const positions = lastAnimation.actors['0'].map(waypoint => waypoint.position);

    const firstPosition = positions[0];
    const restOfPositions = positions.slice(1);

    return `
M ${firstPosition.x} ${firstPosition.y}
${_.flatten(restOfPositions.map(p => ['L', p.x, p.y])).join(' ')}
    `;
  }

  return `
    M 0 0,
    Z
  `;
}

function editorView (state$, actors$) {
  const actorState$ = actors$
    .flatMapLatest(actors =>
      Rx.Observable.combineLatest(actors.map(actor => actor.DOM))
    );

  return Rx.Observable.combineLatest(state$, actorState$, (state, actors) => (
    div('.editor', [
      div('.state', JSON.stringify(state, null, 2)),

      button('.record', state.mode === 'recording' ? 'Recording' : 'Record'),

      button('.play', state.mode === 'playing' ? 'Playing' : 'Play'),

      svg('svg.canvas', svgStyle(), [
        ...actors,
        svg('path.foo', {d: pathFromState(state)}, [])
      ])
    ])
  ));
}

function finishRecording (state) {
  return Object.assign({}, state, {mode: 'editing'});
}

function startRecording (state) {
  return Object.assign({}, state, {mode: 'recording', animations: state.animations.concat([{actors: {}}])});
}

function playRecording (state) {
  return Object.assign({}, state, {mode: 'playing'});
}

function updateActor (existingActorInAnimation, actorModel, time) {
  return existingActorInAnimation.concat([{
    position: actorModel.position,
    time: time.appTime
  }]);
}

function updateAnimation (animation, actorModel, time) {
  const getActor = actorModel => {
    return animation.actors && animation.actors[actorModel.name] || [];
  };

  const updatedActor = updateActor(getActor(actorModel), actorModel, time);

  return Object.assign({}, animation, {
    actors: Object.assign({}, animation.actors, {[actorModel.name]: updatedActor})
  });
}

function animationWaypoint (actorModel) {
  return function updateAnimationState (state, time) {
    if (state.animations.length === 0 || state.mode !== 'recording') {
      return state;
    }

    const updatedAnimation = updateAnimation(_.last(state.animations), actorModel, time);

    const animations = state.animations
      .slice(0, state.animations.length - 1)
      .concat([updatedAnimation]);

    return Object.assign({}, state, { animations });
  };
}

export default function editor ({DOM}, testScheduler=Rx.Scheduler.immediate) {
  const recording$ = DOM
    .select('.record')
    .events('click')
    .startWith(false)
    .scan((current, _) => !current);

  const play$ = DOM
    .select('.play')
    .events('click')
    .map(_ => 'playing');

  const mode$ = recording$.merge(play$);

  const changeMode$ = mode$.map(recording => ({
    true: startRecording,
    false: finishRecording,
    'playing': playRecording
  }[recording]));

  const actors$ = Rx.Observable.just([
    Actor({DOM, props: {imagePath: '/paddle.png', name: '0', position: {x: 150, y: 250}}}, '0'),
    Actor({DOM, props: {imagePath: '/ball.png', name: '1', position: {x: 500, y: 250}}},'1'),
    Actor({DOM, props: {imagePath: '/paddle.png', name: '2', position: {x: 850, y: 250}}},'2')
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

  const appStartTime$ = Rx.Observable.just(0, testScheduler)
    .timestamp()
    .first()
    .pluck('timestamp');

  const time$ = Rx.Observable.interval(1000 / 60, testScheduler)
    .startWith(0)
    .timestamp()
    .withLatestFrom(appStartTime$, ({timestamp}, appStartTime) => ({
      appTime: timestamp - appStartTime,
      absolute: timestamp
    }));

  const state$ = action$.withLatestFrom(time$)
    .startWith(initialState)
    .scan((state, [action, time]) => action(state, time))
    .distinctUntilChanged(JSON.stringify);

  return {
    DOM: editorView(state$, actors$),
    state$,
    actors$,
    time$
  };
}
