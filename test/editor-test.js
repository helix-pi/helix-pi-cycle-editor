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

import editor from '../src/editor';

import Rx from 'rx';
import {mockDOMResponse} from '@cycle/dom';

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
      onNext(400)
    );

    const mousemove$ = scheduler.createHotObservable(
      onNext(250, {clientX: 0, clientY: 0}),
      onNext(350, {clientX: 200, clientY: 300})
    );

    const mockedResponse = mockDOMResponse({
      ':root': {
        mousemove: mousemove$
      },
      '.actor-0': {
        mousedown: mousedown$,
        mouseup: mouseup$
      },
      '.record': {
        click: click$
      }
    });

    const results = scheduler.startScheduler(() => {
      return editor({DOM: mockedResponse}).state$;
    });

    const expectedAnimation = {
      start: 250,
      end: 500,
      actors: {
        '0': [
          { frame: 250, position: {x: 150, y: 150} },
          { frame: 350, position: {x: 200, y: 300} }
        ]
      }
    };

    collectionAssert.assertEqual([
      onNext(200, state => state.animations.length === 0),
      onNext(250, state => state.animations.length === 0),
      onNext(500, state => {
        assert.deepEqual(state.animations[0], expectedAnimation);

        return true;
      })
    ], results.messages);

    done();
  });
});
