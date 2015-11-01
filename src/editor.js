import Rx from 'rx';
import {h} from '@cycle/dom';

Rx.config.longStackSupport = true;

const {div} = require('hyperscript-helpers')(h);

function editorView () {
  return (
    div('.editor', [
      div('.actor', 'hey'),
      div('.actor', 'hey'),
      div('.actor', 'hey')
    ])
  );
}

export default function editor ({DOM}) {
  return {
    DOM: Rx.Observable.just(editorView())
  };
}
