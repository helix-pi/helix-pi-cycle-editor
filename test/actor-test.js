/* globals describe, it */

import Rx from 'rx';
import Actor from '../src/actor';

import {mockDOMSource} from '@cycle/dom';
import collectionAssert from './test-helper';

const onNext = Rx.ReactiveTest.onNext;
const onCompleted = Rx.ReactiveTest.onCompleted;
const subscribe = Rx.ReactiveTest.subscribe;

describe('Actor', () => {
  it('can be dragged around', (done) => {
    const scheduler = new Rx.TestScheduler();

    const mousedown$ = scheduler.createHotObservable(
      onNext(300, {preventDefault: () => true, target: {classList: '.actor-0'}})
    );

    const mouseup$ = scheduler.createHotObservable(
      onNext(400)
    );

    const mousemove$ = scheduler.createHotObservable(
      onNext(250, {clientX: 0, clientY: 0}),
      onNext(350, {clientX: 500, clientY: 200})
    );

    const mockedResponse = mockDOMSource({
      '.app': {
        mouseup: mouseup$,
        mousemove: mousemove$
      },
      'svg': {
        mousedown: mousedown$
      }
    });

    const props = {
      position: {x: 200, y: 200},
      name: '0'
    };

    const results = scheduler.startScheduler(() => {
      return Actor({DOM: mockedResponse, props}, '0').model$.pluck('position');
    });

    collectionAssert.assertEqual([
      onNext(200, {x: 200, y: 200}),
      onNext(300, {x: 200, y: 200}),
      onNext(350, {x: 500, y: 200})
    ], results.messages);

    done();
  });
});
