import CardInlineTitleSlot from './slots/CardInlineTitleSlot';
import CardInfoSlot from './slots/CardInfoSlot';
import styles from './CardGridSection.module.css';

export default function CardInfoSection({
  product,
  cardStyle,
  infoSlots,
  titleMode,
  bodyStyleOverride,
}) {
  return (
    <div className={styles.cardBody} style={bodyStyleOverride}>
      {titleMode === 'inline' ? (
        <CardInlineTitleSlot product={product} cardStyle={cardStyle} />
      ) : null}
      {infoSlots.map((slot) => (
        <CardInfoSlot key={slot.id} slot={slot} product={product} />
      ))}
    </div>
  );
}
