import { parseInformationText } from '../../../model/view/informationTextModel';
import styles from './InformationText.module.css';

const SEGMENT_CLASS_NAMES = {
  heading: styles.heading,
  important: styles.important,
};

const SEGMENT_TEST_IDS = {
  heading: 'information-text-heading',
  important: 'information-text-important',
};

/**
 * 판매자가 쓴 안내 문구를 강조 규칙대로 그린다. 조각을 React 요소로 만들 뿐
 * innerHTML 을 쓰지 않으므로, 판매자가 무엇을 적든 태그로 해석되지 않는다.
 */
export default function InformationText({ text }) {
  const segments = parseInformationText(text);

  if (segments.length === 0) {
    return null;
  }

  return segments.map((segment, index) =>
    segment.style === 'plain' ? (
      // 조각은 순서로만 식별된다. 같은 글자가 반복될 수 있어 text 는 key 가 될 수 없다.
      // eslint-disable-next-line react/no-array-index-key
      <span key={index}>{segment.text}</span>
    ) : (
      <strong
        // eslint-disable-next-line react/no-array-index-key
        key={index}
        className={SEGMENT_CLASS_NAMES[segment.style]}
        data-testid={SEGMENT_TEST_IDS[segment.style]}
      >
        {segment.text}
      </strong>
    ),
  );
}
