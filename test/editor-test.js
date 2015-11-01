/* globals describe, it */

function ok (isOk, message) {
  if (!isOk) {
    throw new Error(message);
  }
}

function createMessage(expected, actual) {
  return 'Expected: [' + expected.toString() + ']\r\nActual: [' + actual.toString() + ']';
}

function prettyMessage (message) {
  if (message.value === undefined) {
    return `@${message.time}: NO VALUE `;
  }

  if (message.value.kind === 'N') {
    return `  @${message.time}: ${JSON.stringify(message.value.value)}`;
  }

  if (message.value.kind === 'C') {
    return `  @${message.time}: -- Complete --`;
  }

  if (message.value.kind === 'E') {
    return `  @${message.time}: -- Error! --: ${message.value.error}`;
  }

  if (message.value.predicate) {
    return `  @${message.time}: PREDICATE ${message.value.predicate.toString()}`;
  }

  return '  IMPLEMENT KIND ' + message.value.kind;
}

function prettyMessages (messages) {
  return messages.map(prettyMessage).join('\n');
}

function createMessage (expected, actual) {
  return 'Expected: \n[\n' + prettyMessages(expected) + '\n]\r\n\nActual: \n[\n' + prettyMessages(actual) + '\n]';
}

var collectionAssert = {
  assertEqual: function (expected, actual) {
    let comparer = Rx.internals.isEqual;
    let isOk = true;

    let isEqualSize = true;

    if (expected.length !== actual.length) {
      console.log('Not equal length. Expected: ' + expected.length + ' Actual: ' + actual.length);
      isEqualSize = false;
    }

    for(var i = 0, len = expected.length; i < len; i++) {
      if (expected[i].value && expected[i].value.predicate) {
        isOk = expected[i].value.predicate(actual[i].value.value);
      } else {
        isOk = comparer(expected[i], actual[i]);
      }

      if (!isOk) {
        break;
      }
    }

    assert(isOk && isEqualSize, createMessage(expected, actual));
  }
};

import assert from 'assert';

import editor, {Actor} from '../src/editor';

import Rx from 'rx';
import {mockDOMResponse} from '@cycle/dom';

import _ from 'lodash';

const onNext = Rx.ReactiveTest.onNext,
  onCompleted = Rx.ReactiveTest.onCompleted,
  subscribe = Rx.ReactiveTest.subscribe;

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
      return editor({DOM: mockedResponse}).state$;
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
      onNext(300)
    );

    const mouseup$ = scheduler.createHotObservable(
      onNext(450)
    );

    const mousemove$ = scheduler.createHotObservable(
      onNext(250, {clientX: 0, clientY: 0}),
      onNext(400, {clientX: 200, clientY: 300})
    );

    const mockedResponse = mockDOMResponse({
      ':root': {
        mousemove: mousemove$
      },
      '.actor-0': {
        mousedown: mousedown$,
        mousemove: mousemove$,
        mouseup: mouseup$
      },
      '.record': {
        click: click$
      }
    });

    const results = scheduler.startScheduler(() => {
      return editor({DOM: mockedResponse}).state$
        .map(state => state.animations.map(ani => ani.actors));
    });

    const expectedAnimation = {
      start: 250,
      end: 500,
      actors: {
        '0': [
          { frame: 250, position: {x: 150, y: 150} },
          { frame: 400, position: {x: 200, y: 300} }
        ]
      }
    };

    collectionAssert.assertEqual([
      onNext(200, []),
      onNext(250, [{}]),
      onNext(300, [{'0': [{position: {x: 150, y: 150}}]}]),
      onNext(400, [{'0': [{position: {x: 150, y: 150}}, {position: {x: 200, y: 300}}]}]),
      onNext(500, [{'0': [{position: {x: 150, y: 150}}, {position: {x: 200, y: 300}}]}])
    ], results.messages);

    done();
  });
});

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
      '.actor-0': {
        mousedown: mousedown$,
        mouseup: mouseup$,
        mousemove: mousemove$
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
