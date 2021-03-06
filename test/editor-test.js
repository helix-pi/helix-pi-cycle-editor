/* globals describe, it */
import assert from 'assert';

import editor from '../src/editor';

import Rx from 'rx';
import {mockDOMSource} from '@cycle/dom';

import _ from 'lodash';

const onNext = Rx.ReactiveTest.onNext;

import collectionAssert from './test-helper';

const fakeStorageDriver = {
  local: {
    getItem: () => Rx.Observable.empty()
  }
};

function actor (animations) {
  if (!animations['0']) {
    throw new Error('Actor "0" not found');
  }

  return animations['0'];
}

describe('the Helix Pi Editor', () => {
  it('exists', () => {
    assert.equal(!!editor, true);
  });

  it('allows recording scenarios', (done) => {
    const scheduler = new Rx.TestScheduler();

    const click$ = scheduler.createHotObservable(
      onNext(250),
      onNext(500)
    );

    const mockedResponse = mockDOMSource({
      '.record': {
        click: click$
      }
    });

    const results = scheduler.startScheduler(() => {
      return editor({DOM: mockedResponse, animation$: Rx.Observable.just({}, scheduler), storage: fakeStorageDriver}).state$;
    });

    collectionAssert.assertEqual([
      onNext(200, state => state.mode === 'editing'),
      onNext(250, state => state.mode === 'recording'),
      onNext(500, state => state.mode === 'editing')
    ], results.messages);

    done();
  });

  it('records the movements of actors', (done) => {
    const scheduler = new Rx.TestScheduler();

    const click$ = scheduler.createHotObservable(
      onNext(250),
      onNext(500)
    );

    const mousedown$ = scheduler.createHotObservable(
      onNext(300, {preventDefault: () => true, target: {classList: '.actor-0'}})
    );

    const mouseup$ = scheduler.createHotObservable(
      onNext(450)
    );

    const mousemove$ = scheduler.createHotObservable(
      onNext(250, {clientX: 0, clientY: 0}),
      onNext(400, {clientX: 200, clientY: 300})
    );

    const mockedResponse = mockDOMSource({
      '.app': {
        mousemove: mousemove$,
        mouseup: mouseup$
      },
      'svg': {
        mousedown: mousedown$
      },
      '.record': {
        click: click$
      }
    });

    const results = scheduler.startScheduler(() => {
      return editor({DOM: mockedResponse, animation$: Rx.Observable.just({}, scheduler), storage: fakeStorageDriver}).state$
        .map(state => state.animations[0] && state.animations[0].actors);
    });

    collectionAssert.assertEqual([
      onNext(200, {}),
      onNext(250, {}),
      onNext(300, animations => _.isEqual(actor(animations)[0].position, {x: 150, y: 250})),
      onNext(400, (animations) => {
        const actorAnimations = actor(animations);
        return _.isEqual(actorAnimations[0].position, {x: 150, y: 250}) &&
          _.isEqual(actorAnimations[1].position, {x: 200, y: 300}) &&
          actorAnimations[0].time <= actorAnimations[1].time;
      }),
      onNext(500, () => true)
    ], results.messages);

    done();
  });


  it('records the movements of actors to the selected animation', (done) => {
    const scheduler = new Rx.TestScheduler();

    const addAnimation$ = scheduler.createHotObservable(
      onNext(230)
    );

    const selectFirstAnimation$ = scheduler.createHotObservable(
      onNext(240, {target: {dataset: {animationId: 0}}})
    );

    const record$ = scheduler.createHotObservable(
      onNext(250),
      onNext(500)
    );

    const mousedown$ = scheduler.createHotObservable(
      onNext(300, {preventDefault: () => true, target: {classList: '.actor-0'}})
    );

    const mouseup$ = scheduler.createHotObservable(
      onNext(450)
    );

    const mousemove$ = scheduler.createHotObservable(
      onNext(250, {clientX: 0, clientY: 0}),
      onNext(400, {clientX: 200, clientY: 300})
    );

    const mockedResponse = mockDOMSource({
      '.app': {
        mousemove: mousemove$,
        mouseup: mouseup$
      },
      'svg': {
        mousedown: mousedown$
      },
      '.record': {
        click: record$
      },
      '.add-animation': {
        click: addAnimation$
      },
      '.animation': {
        click: selectFirstAnimation$
      }
    });

    const results = scheduler.startScheduler(() => {
      return editor({DOM: mockedResponse, animation$: Rx.Observable.just({}, scheduler), storage: fakeStorageDriver}).state$
        .map(state => state.animations[0] && state.animations[0].actors)
        .distinctUntilChanged(JSON.stringify);
    });

    collectionAssert.assertEqual([
      onNext(200, {}),
      onNext(300, animations => _.isEqual(actor(animations)[0].position, {x: 150, y: 250})),
      onNext(400, (animations) => {
        const actorAnimations = actor(animations);
        return _.isEqual(actorAnimations[0].position, {x: 150, y: 250}) &&
          _.isEqual(actorAnimations[1].position, {x: 200, y: 300}) &&
          actorAnimations[0].time <= actorAnimations[1].time;
      })
    ], results.messages);

    done();
  });

  it('plays back recorded', (done) => {
    const scheduler = new Rx.TestScheduler();

    const click$ = scheduler.createHotObservable(
      onNext(250),
      onNext(500)
    );

    const mockedResponse = mockDOMSource({
      '.play': {
        click: click$
      }
    });

    const results = scheduler.startScheduler(() => {
      return editor({DOM: mockedResponse, animation$: Rx.Observable.just({}, scheduler), storage: fakeStorageDriver}).state$
        .map(state => state.mode)
        .distinctUntilChanged();
    });

    collectionAssert.assertEqual([
      onNext(200, 'editing'),
      onNext(250, 'playing'),
      onNext(500, 'editing')
    ], results.messages);

    done();
  });

  it('allows deleting animations', () => {
    const scheduler = new Rx.TestScheduler();

    const click$ = scheduler.createHotObservable(
      onNext(250)
    );

    const animationDestroy$ = scheduler.createHotObservable(
      onNext(350, {target: {dataset: {animationId: 1}}})
    );

    const mockedResponse = mockDOMSource({
      '.add-animation': {
        click: click$
      },
      '.animation .destroy': {
        click: animationDestroy$
      }
    });

    const results = scheduler.startScheduler(() => {
      return editor({DOM: mockedResponse, animation$: Rx.Observable.just({}, scheduler), storage: fakeStorageDriver}).state$
        .map(state => state.animations.length)
        .distinctUntilChanged();
    });


    collectionAssert.assertEqual([
      onNext(200, 1),
      onNext(250, 2),
      onNext(350, 1)
    ], results.messages);
  });

  it('deletes the right animation', () => {
    const scheduler = new Rx.TestScheduler();

    const click$ = scheduler.createHotObservable(
      onNext(250),
      onNext(460)
    );

    const addAnimation$ = scheduler.createHotObservable(
      onNext(500)
    );

    const animationDestroy$ = scheduler.createHotObservable(
      onNext(520, {target: {dataset: {animationId: 0}}})
    );

    const mousedown$ = scheduler.createHotObservable(
      onNext(300, {preventDefault: () => true, target: {classList: '.actor-0'}})
    );

    const mouseup$ = scheduler.createHotObservable(
      onNext(450)
    );

    const mousemove$ = scheduler.createHotObservable(
      onNext(250, {clientX: 0, clientY: 0}),
      onNext(400, {clientX: 200, clientY: 300})
    );

    const mockedResponse = mockDOMSource({
      '.app': {
        mousemove: mousemove$,
        mouseup: mouseup$
      },
      'svg': {
        mousedown: mousedown$
      },
      '.record': {
        click: click$
      },
      '.animation .destroy': {
        click: animationDestroy$
      },
      '.add-animation': {
        click: addAnimation$
      }
    });

    const results = scheduler.startScheduler(() => {
      return editor({DOM: mockedResponse, animation$: Rx.Observable.just({}, scheduler), storage: fakeStorageDriver}).state$
        .map(state => state.animations[0] && Object.keys(state.animations[0].actors).length)
        .distinctUntilChanged();
    });

    collectionAssert.assertEqual([
      onNext(200, 0),
      onNext(300, 1),
      onNext(520, 0)
    ], results.messages);
  });

  it('allows selecting animations by clicking on them', () => {
    const scheduler = new Rx.TestScheduler();

    const selectAnimation$ = scheduler.createHotObservable(
      onNext(250, {target: {dataset: {animationId: 0}}})
    );

    const addAnimation$ = scheduler.createHotObservable(
      onNext(230)
    );

    const mockedResponse = mockDOMSource({
      '.animation': {
        click: selectAnimation$
      },
      '.add-animation': {
        click: addAnimation$
      }
    });

    const results = scheduler.startScheduler(() => {
      return editor({DOM: mockedResponse, animation$: Rx.Observable.just({}, scheduler), storage: fakeStorageDriver}).state$
        .pluck('selectedAnimation')
        .distinctUntilChanged();
    });

    collectionAssert.assertEqual([
      onNext(200, 0),
      onNext(230, 1),
      onNext(250, 0)
    ], results.messages);
  });

  it('plays stuff', () => {
    const scheduler = new Rx.TestScheduler();

    const addAnimation$ = scheduler.createHotObservable(
      onNext(230)
    );

    const selectFirstAnimation$ = scheduler.createHotObservable(
      onNext(240, {target: {dataset: {animationId: 0}}})
    );

    const record$ = scheduler.createHotObservable(
      onNext(250),
      onNext(500)
    );

    const mousedown$ = scheduler.createHotObservable(
      onNext(300, {preventDefault: () => true, target: {classList: '.actor-0'}})
    );

    const mouseup$ = scheduler.createHotObservable(
      onNext(450)
    );

    const mousemove$ = scheduler.createHotObservable(
      onNext(250, {clientX: 0, clientY: 0}),
      onNext(400, {clientX: 200, clientY: 300})
    );

    const clickPlay$ = scheduler.createHotObservable(
      onNext(510)
    );

    const mockedResponse = mockDOMSource({
      '.app': {
        mousemove: mousemove$,
        mouseup: mouseup$
      },
      'svg': {
        mousedown: mousedown$
      },
      '.record': {
        click: record$
      },
      '.add-animation': {
        click: addAnimation$
      },
      '.animation': {
        click: selectFirstAnimation$
      },
      '.play': {
        click: clickPlay$
      }
    });

    const animation$ = scheduler.createHotObservable(
      onNext(420, 0),
      onNext(520, 100)
    );

    const results = scheduler.startScheduler(() => {
      return editor({DOM: mockedResponse, animation$, storage: fakeStorageDriver}).state$
    });
  });
});
