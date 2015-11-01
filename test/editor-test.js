/* globals describe, it */

import assert from 'assert';

import editor from '../src/editor';

import {mockDOMResponse} from '@cycle/dom';
import $ from 'vdom-query';

describe('the Helix Pi Editor', () => {
  it('exists', () => {
    assert.equal(!!editor, true);
  });

  it('can be called', (done) => {
    const mockedResponse = mockDOMResponse({});

    editor({DOM: mockedResponse});

    done();
  });

  it('renders the editor', (done) => {
    const mockedResponse = mockDOMResponse({});

    editor({DOM: mockedResponse}).DOM.subscribe(vtree => {
      assert.equal(vtree.properties.className, 'editor');
      assert.deepEqual(vtree.children.map(el => el.properties.className), ['actor', 'actor', 'actor']);
      done();
    });
  });
});
