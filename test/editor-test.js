/* globals describe, it */
import assert from 'assert';

import editor from '../src/editor';

import Rx from 'rx';
import {mockDOMResponse} from '@cycle/dom';

import _ from 'lodash';

const onNext = Rx.ReactiveTest.onNext;

import collectionAssert from './test-helper';

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

    const mockedResponse = mockDOMResponse({
      '.record': {
        click: click$
      }
    });

    const results = scheduler.startScheduler(() => {
      return editor({DOM: mockedResponse, animation$: Rx.Observable.just({}, scheduler)}).state$;
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

    const mockedResponse = mockDOMResponse({
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
      return editor({DOM: mockedResponse, animation$: Rx.Observable.just({}, scheduler)}).state$
        .map(state => state.animations.map(ani => ani.actors));
    });

    function actor (animations) {
      return animations[0]['0'];
    }

    collectionAssert.assertEqual([
      onNext(200, []),
      onNext(250, [{}]),
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

  it('plays back recorded', (done) => {
    const scheduler = new Rx.TestScheduler();

    const click$ = scheduler.createHotObservable(
      onNext(250)
    );

    const mockedResponse = mockDOMResponse({
      '.play': {
        click: click$
      }
    });

    const results = scheduler.startScheduler(() => {
      return editor({DOM: mockedResponse, animation$: Rx.Observable.just({}, scheduler)}).state$
        .map(state => state.mode);
    });

    collectionAssert.assertEqual([
      onNext(200, 'editing'),
      onNext(250, 'playing')
    ], results.messages);

    done();
  });
});
