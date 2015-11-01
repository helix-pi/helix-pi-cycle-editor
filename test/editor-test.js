/* globals describe, it */

const assert = require('assert');
const editor = require('../src/editor');

describe('the Helix Pi Editor', () => {
  it('exists', () => {
    assert.equal(!!editor, true);
  });
});
