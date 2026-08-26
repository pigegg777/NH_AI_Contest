import { INFORMATION_EMPHASIS_AI_SYSTEM_INSTRUCTIONS } from './informationEmphasisPrompt';
import { INFORMATION_EMPHASIS_AI_SCHEMA } from '../ai-response/informationEmphasisAiSchema';

const INFORMATION_EMPHASIS_AI_RESPONSE_FORMAT_NAME =
  'storefront_information_emphasis';
// 입력이 2000자 이하이고 출력은 거기에 마커 몇 쌍이 더해진 길이다. 한글은
// 토큰을 넉넉히 먹으므로 여유를 두되, 모델이 장문을 지어낼 여지는 남기지 않는다.
const INFORMATION_EMPHASIS_AI_MAX_OUTPUT_TOKENS = 1500;

export function buildInformationEmphasisOpenAiRequestBody({
  label,
  description,
  openAiModel,
}) {
  return {
    model: openAiModel,
    input: [
      {
        role: 'system',
        content: INFORMATION_EMPHASIS_AI_SYSTEM_INSTRUCTIONS.join('\n'),
      },
      {
        // 라벨은 마커를 넣을 대상이 아니라 판단 재료다. "영세가격 안내"라는
        // 제목을 알면 본문에서 무엇이 중요한지 고르기가 정확해진다.
        role: 'user',
        content: JSON.stringify({ label, description }, null, 2),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: INFORMATION_EMPHASIS_AI_RESPONSE_FORMAT_NAME,
        strict: true,
        schema: INFORMATION_EMPHASIS_AI_SCHEMA,
      },
    },
    max_output_tokens: INFORMATION_EMPHASIS_AI_MAX_OUTPUT_TOKENS,
  };
}
