import Cycle from '@cycle/core';
import {makeDOMDriver} from '@cycle/dom';

import main from './src/editor';

if (module.hot) {
  module.hot.accept();
}

Cycle.run(main, {
  DOM: makeDOMDriver('.app')
});
