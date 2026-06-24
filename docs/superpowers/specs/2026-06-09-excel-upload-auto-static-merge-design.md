# Excel Upload Auto Static Merge Design

## Goal

엑셀 업로드(`extract`)와 정적 데이터 병합(`static merge`)을 하나의 흐름으로 합친다. 다만 이 자동 병합은 사이드바의 기본 카테고리인 `비료`, `농약`을 선택했을 때만 활성화되고, 추가 카테고리 등록에서는 절대 실행되지 않아야 한다.

## Product Rules

1. 사이드바 기본 카드 `비료`, `농약`은 클릭 가능한 선택 카드다.
2. 기본 카드를 선택한 상태에서 파일을 업로드하면:
   - 워크북 추출을 실행한다.
   - 추출 성공 후 정적 데이터 병합을 자동 실행한다.
3. 추가 카테고리 등록은 자동 병합을 사용하지 않는다.
   - 사이드바 입력창에 값을 직접 입력하는 순간 현재 선택은 `custom`으로 전환된다.
   - `custom` 상태에서는 업로드 후 추출만 수행한다.
4. 기존 `병합하기` 버튼은 제거한다.
5. 이미 병합된 워크북이라도 카테고리를 `custom`으로 바꾸면 저장 대상 행은 병합 전 원본(annotated rows)으로 되돌아가야 한다.

## Architecture

### Category Selection

- 저장 카테고리 상태는 기존 `useWorkbookReviewSave`의 `tableNameMode`를 계속 사용한다.
- `fertilizer`, `pesticide`, `custom` 세 모드만으로 현재 업로드/저장 의도를 표현한다.
- 기본 카드 모델은 UI가 바로 쓸 수 있게 `selectionMode`, `isSelectable` 정보를 함께 반환한다.

### Auto Merge Coordination

- `useWorkbookExtraction`은 계속 추출만 책임진다.
- `useWorkbookReviewPipeline`은 계속 병합 로직을 책임지되, `isStaticMergeEnabled` 입력을 받아서:
  - 병합 활성 상태일 때만 `mergedRows`에 정적 데이터가 반영되도록 한다.
  - 비활성 상태에서는 이미 lookup이 있어도 `annotatedRows`를 그대로 반환한다.
- 자동 병합 트리거는 작은 전용 hook으로 분리한다.
  - 입력: `workbookFingerprint`, `hasResult`, `isStaticMergeEnabled`, `isMerged`, `isMerging`, `handleMerge`
  - 역할: 같은 워크북에 대해 자동 병합을 한 번만 요청하고, `custom -> default` 재선택 시 재시도를 허용한다.

## UI Behavior

- 사이드바 기본 카드에는 선택 상태 스타일을 추가한다.
- 기본 카드 선택 시 입력창은 비워서 보여주되, 이전 custom 입력값은 state에 보존한다.
- 사용자가 입력창에 값을 타이핑하면 현재 선택은 자동으로 `custom`으로 바뀐다.
- 업로드 영역에서는 `병합하기` 버튼을 제거하고, 병합 완료 메시지만 남긴다.

## Error Handling

- 추출 실패 시 병합은 시도하지 않는다.
- 자동 병합 실패 시 기존 `mergeError` 메시지를 그대로 노출한다.
- 자동 병합 실패 후 사용자가 기본 카드를 다시 선택하면 동일 워크북에 대해 재시도할 수 있어야 한다.

## Testing

- 카탈로그 모델 테스트:
  - 기본 카드에 선택 메타(`selectionMode`, `isSelectable`)가 포함되는지 확인
- 자동 병합 hook 테스트:
  - 기본 카테고리 + 추출 결과 존재 시 한 번만 `handleMerge` 호출
  - `custom`에서는 호출 안 함
  - `custom -> default` 전환 시 재시도 가능
- 리뷰 파이프라인 테스트:
  - 병합 lookup이 있어도 `isStaticMergeEnabled=false`면 `mergedRows`가 원본 행을 반환
- 페이지 테스트:
  - 기본 카드 클릭 후 저장 시 preset 카테고리명 사용
  - 입력창 타이핑 시 `custom`으로 복귀
  - `병합하기` 버튼이 렌더되지 않음
