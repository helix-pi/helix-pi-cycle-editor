/* globals describe, it */
import assert from 'assert';

import tween from '../src/tween';

function position ({x, y, time}) {
  return {
    position: {
      x,
      y
    },

    time
  };
}

describe('tween', () => {
  it('tweens across a set of values', () => {
    const positions = [
      position({x: 0, y: 0, time: 0}),

      position({x: 10, y: 0, time: 10})
    ];

    assert.deepEqual(tween(positions, 0), {x: 0, y: 0});
    assert.deepEqual(tween(positions, 5), {x: 5, y: 0});
    assert.deepEqual(tween(positions, 10), {x: 10, y: 0});
  });

  it('tweens diagonally just fine', () => {
    const positions = [
      position({x: 0, y: 0, time: 0}),

      position({x: 20, y: 20, time: 10})
    ];

    assert.deepEqual(tween(positions, 0), {x: 0, y: 0});
    assert.deepEqual(tween(positions, 5), {x: 10, y: 10});
    assert.deepEqual(tween(positions, 10), {x: 20, y: 20});
  });
});
