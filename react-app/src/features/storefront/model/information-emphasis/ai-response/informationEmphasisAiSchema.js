/**
 * 필드 하나짜리 계약. 설명 문구나 근거를 같이 받지 않는 이유는, 그걸 화면에
 * 보여줄 자리가 없고 받아두면 언젠가 쓰게 되기 때문이다.
 */
export const INFORMATION_EMPHASIS_AI_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    description: { type: 'string' },
  },
  required: ['description'],
};
