import { toOptionalTrimmedString } from './requestValidation.js';

// Each AI route picks the model that suits its own job — bulk scanning,
// matching, or web-backed research — so a single shared key would drag
// unrelated routes along with whatever one of them needed. The route's own
// key wins; OPENAI_MODEL stays as a deliberate "move every text route at
// once" lever; the route's default is the floor.
//
// Image routes must not read OPENAI_MODEL: a text model id sent to the
// images endpoint fails outright, so they pass their own key only.
export function resolveOpenAiModel(env, envKey, defaultModel) {
  return (
    toOptionalTrimmedString(env?.[envKey]) ||
    toOptionalTrimmedString(env?.OPENAI_MODEL) ||
    defaultModel
  );
}

export function resolveOpenAiImageModel(env, envKey, defaultModel) {
  return toOptionalTrimmedString(env?.[envKey]) || defaultModel;
}
