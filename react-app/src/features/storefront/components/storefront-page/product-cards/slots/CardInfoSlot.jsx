import { hasRenderableValue } from '../../../../model/card-grid-section/cardFieldRenderModel';
import CardFieldSlot from './CardFieldSlot';
import CardInlineGroupSlot from './CardInlineGroupSlot';
import CardStackGroupSlot from './CardStackGroupSlot';

export default function CardInfoSlot({ slot, product }) {
  if (slot.kind === 'inline-group') {
    return <CardInlineGroupSlot slot={slot} product={product} />;
  }

  if (slot.kind === 'stack-group') {
    return <CardStackGroupSlot slot={slot} product={product} />;
  }

  if (!hasRenderableValue(product?.[slot.field])) {
    return null;
  }

  return <CardFieldSlot slot={slot} product={product} />;
}
