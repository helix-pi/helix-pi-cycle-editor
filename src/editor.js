import Rx from 'rx';
import {h, svg} from '@cycle/dom';
import _ from 'lodash';

import hyperScriptHelpers from 'hyperscript-helpers';

const {div, button} = hyperScriptHelpers(h);

import Actor from './actor';

function Animation () {
  return {name: 'New animation', actors: {}};
}

function svgStyle () {
  return {
    width: '100%',
    height: '100%'
  };
}

function displayPath (positions) {
  if (positions === []) {
    return `
      M 0 0,
      Z
        `;
  }

  const firstPosition = positions[0];
  const restOfPositions = positions.slice(1);

  return `
    M ${firstPosition.x} ${firstPosition.y}
  ${_.flatten(restOfPositions.map(p => ['L', p.x, p.y])).join(' ')}
  `;
}

function selectedAnimation (state) {
  return state.animations[state.selectedAnimation];
}

function paths (state) {
  const animation = selectedAnimation(state);

  if (!animation) {
    return [];
  }

  const actors = _.values(animation.actors);

  return actors.map(actorAnimation => actorAnimation.map(waypoint => waypoint.position));
}

function displayAnimation (animation, index, selected) {
  return div(`.animation ${selected ? '.selected' : ''}`, {dataset: {animationId: index}}, [
    animation.name,
    button('.destroy', {dataset: {animationId: index}}, 'x')
  ]);
}

function editorView (state$, actors$) {
  const actorState$ = actors$
    .flatMapLatest(actors =>
      Rx.Observable.combineLatest(actors.map(actor => actor.DOM))
    );

  return Rx.Observable.combineLatest(state$, actorState$, (state, actors) => (
    div('.editor', [
      div('.main', [
        div('.animations', [
          state.animations.map((animation, index) => displayAnimation(animation, index, state.selectedAnimation === index)),

          button('.add-animation', '+')
        ]),

        svg('svg.canvas', svgStyle(), [
          ...actors,

          ...paths(state).map(displayPath).map(path => svg('path', {d: path}, []))
        ])
      ]),

      div('.controls', [
        div('.buttons', [
          button('.record', state.mode === 'recording' ? 'Recording' : 'Record'),

          button('.play', state.mode === 'playing' ? 'Playing' : 'Play')
        ])
      ])
    ])
  ));
}

function finishRecording (state) {
  return {
    ...state,

    mode: 'editing'
  };
}

function addAnimation (state) {
  return function (state) {
    return {
      ...state,

      selectedAnimation: state.animations.length,
      animations: [...state.animations, Animation()]
    };
  };
}

function startRecording (state) {
  return {
    ...state,

    mode: 'recording'
  };
}

function playRecording (state) {
  return {
    ...state,

    mode: state.mode === 'playing' ? 'editing' : 'playing'
  };
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

  return {
    ...animation,

    actors: {
      ...animation.actors,

      [actorModel.name]: updatedActor
    }
  };
}

function animationWaypoint (actorModel) {
  return function updateAnimationState (state, time) {
    if (state.animations.length === 0 || state.mode !== 'recording') {
      return state;
    }

    const updatedAnimation = updateAnimation(selectedAnimation(state), actorModel, time);

    const animations = state.animations.slice();

    animations[state.selectedAnimation] = updatedAnimation;

    return {
      ...state,

      animations
    };
  };
}

function loadState (loadedState) {
  return function parseLoadedState (state) {
    if (!loadedState) {
      return state;
    }

    return JSON.parse(loadedState);
  };
}

function selectAnimation (event) {
  const selectedAnimation = parseInt(event.target.dataset.animationId, 10);

  return function (state) {
    return {
      ...state,

      selectedAnimation
    };
  };
}

function destroyAnimation (event) {
  return function (state) {
    const newAnimations = state.animations.asMutable && state.animations.asMutable() || state.animations.slice();

    const indexToRemove = parseInt(event.target.dataset.animationId, 10);

    newAnimations.splice(indexToRemove, 1);

    let newSelectedAnimation = state.selectedAnimation;

    if (indexToRemove <= state.selectedAnimation) {
      newSelectedAnimation = state.selectedAnimation - 1;
    }

    return {
      ...state,

      selectedAnimation: newSelectedAnimation,
      animations: newAnimations
    };
  };
}

function tweenAllTheThings (time) {
  return function (state) {
    if (state.mode === 'playing') {
    }
    return state;
  };
}

function updateStartedPlaying (time) {
  return function (state) {
    return {
      ...state,

      startedPlayingAt: time
    };
  };
}

export default function editor ({DOM, animation$, storage}) {
  const appStartTime$ = animation$
    .take(1)
    .timestamp()
    .pluck('timestamp');

  const time$ = animation$
    .timestamp()
    .withLatestFrom(appStartTime$, ({timestamp}, appStartTime) => ({
      appTime: timestamp - appStartTime,
      absolute: timestamp
    }))
    .startWith({
      appTime: 0,
      absolute: 0
    });

  const recording$ = DOM
    .select('.record')
    .events('click')
    .startWith(false)
    .scan((current, _) => !current);

  const play$ = DOM
    .select('.play')
    .events('click')
    .map(_ => 'playing');

  const addAnimation$ = DOM
    .select('.add-animation')
    .events('click')
    .map(addAnimation);

  const mode$ = recording$.merge(play$);

  const changeMode$ = mode$.map(recording => ({
    true: startRecording,
    false: finishRecording,
    'playing': playRecording
  }[recording]));

  const startedPlaying$ = time$
    .sample(mode$.filter(mode => mode === 'playing'))
    .map(updateStartedPlaying);

  const actors$ = Rx.Observable.just([
    Actor({DOM, props: {imagePath: '/paddle.png', name: '0', position: {x: 150, y: 250}}}, '0'),
    Actor({DOM, props: {imagePath: '/ball.png', name: '1', position: {x: 500, y: 250}}}, '1'),
    Actor({DOM, props: {imagePath: '/paddle.png', name: '2', position: {x: 850, y: 250}}}, '2')
  ]);

  const animationWaypoint$ = actors$.flatMap(
    actors => Rx.Observable.merge(actors.map(actor => actor.model$)),
    (_, actorModel) => animationWaypoint(actorModel)
  );

  const loadState$ = storage.local.getItem('state').map(loadState).take(1);

  const deleteAnimation$ = DOM
    .select('.animation .destroy')
    .events('click')
    .map(destroyAnimation);

  const selectAnimation$ = DOM
    .select('.animation')
    .events('click')
    .map(selectAnimation);

  const tweenWhenPlaying$ = time$.map(tweenAllTheThings);

  const action$ = Rx.Observable.merge(
    loadState$,
    changeMode$,
    animationWaypoint$,
    deleteAnimation$,
    tweenWhenPlaying$,
    startedPlaying$,
    selectAnimation$,
    addAnimation$
  );

  const initialState = {
    mode: 'editing',
    animations: [Animation()],
    selectedAnimation: 0,
    startedPlayingAt: null
  };

  function log (...things) {
    console.log(...things);

    return things[1];
  }

  const state$ = action$.withLatestFrom(time$)
    .startWith(initialState)
    .scan((state, [action, time]) => action(state, time))
    .distinctUntilChanged(JSON.stringify);

  return {
    DOM: editorView(state$, actors$),
    state$,
    actors$,
    time$,
    storage: state$.skip(1).debounce(300).map(state => ({key: 'state', value: JSON.stringify(state)}))
  };
}
