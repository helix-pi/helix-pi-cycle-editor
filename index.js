import Cycle from '@cycle/core';
import {makeDOMDriver} from '@cycle/dom';
import {makeAnimationDriver} from 'cycle-animation-driver';
import storageDriver from '@cycle/storage';

import {restart, restartable} from 'cycle-restart';

import main from './src/editor';

const drivers = {
  DOM: restartable(makeDOMDriver('.app'), {pauseSinksOnReplay: false}),
  animation$: restartable(makeAnimationDriver()),
  storage: restartable(storageDriver)
};

let {sinks, sources} = Cycle.run(main, drivers);

if (module.hot) {
  module.hot.accept('./src/editor', () => {
    const newMain = require('./src/editor').default;

    const newSinksAndSources = restart(newMain, drivers, {sinks, sources});

    sinks = newSinksAndSources.sinks;
    sources = newSinksAndSources.sources;
  });
}

