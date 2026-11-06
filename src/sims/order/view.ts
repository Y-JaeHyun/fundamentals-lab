import { h } from '../../ui/dom';
import { renderOrder } from '../../ui/order';
import type { SimView } from '../registry';
import type { OrderSimData } from './model';

export const orderSim: SimView = {
  kind: 'order',
  mount(el, data, ctx) {
    const d = data as OrderSimData;
    el.append(h('p', { class: 'prompt' }, d.prompt));
    renderOrder(el, d.items, ctx.onComplete);
    return () => {};
  },
};
