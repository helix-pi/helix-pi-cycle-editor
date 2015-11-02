/* globals describe, it */

import Rx from 'rx';
import Actor from '../src/actor';

import {mockDOMResponse} from '@cycle/dom';
import collectionAssert from './test-helper';

const onNext = Rx.ReactiveTest.onNext;
const onCompleted = Rx.ReactiveTest.onCompleted;
const subscribe = Rx.ReactiveTest.subscribe;

describe('Actor', () => {
  it('can be dragged around', (done) => {
    const scheduler = new Rx.TestScheduler();

    const mousedown$ = scheduler.createHotObservable(
      onNext(300)
    );

    const mouseup$ = scheduler.createHotObservable(
      onNext(400)
    );

    const mousemove$ = scheduler.createHotObservable(
      onNext(250, {clientX: 0, clientY: 0}),
      onNext(350, {clientX: 500, clientY: 200})
    );

    const mockedResponse = mockDOMResponse({
      '.app': {
        mouseup: mouseup$,
        mousemove: mousemove$
      },
      '.actor-0': {
        mousedown: mousedown$
      }
    });

    const results = scheduler.startScheduler(() => {
      return Actor({DOM: mockedResponse}, '0').model$.pluck('position');
    });

    collectionAssert.assertEqual([
      onNext(200, {x: 150, y: 150}),
      onNext(300, {x: 150, y: 150}),
      onNext(350, {x: 500, y: 200})
    ], results.messages);

    done();
  });
});
