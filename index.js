import Cycle from '@cycle/core';
import {makeDOMDriver} from '@cycle/dom';
import {makeAnimationDriver} from 'cycle-animation-driver';

import main from './src/editor';

if (module.hot) {
  module.hot.accept();
}

Cycle.run(main, {
  DOM: makeDOMDriver('.app'),
  animation$: makeAnimationDriver()
});
