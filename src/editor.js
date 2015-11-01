import Rx from 'rx';
import {h} from '@cycle/dom';

export default function editor ({DOM}) {
  return {
    DOM: Rx.Observable.just(h('div', 'hizazzz'))
  };
}
