# Excel Review Add Category Input Design

## Goal

사이드바의 기본 카테고리 `비료`, `농약`은 클릭 즉시 선택되게 유지하고, 그 외 카테고리는 `+ 추가`를 눌렀을 때만 이름 입력 UI가 나타나도록 바꾼다.

## Product Rules

1. `비료`, `농약`은 기본 선택 카드다.
2. 기본 카드 클릭 시 즉시 해당 카테고리가 현재 저장 대상이 된다.
3. `+ 추가` 클릭 시 현재 모드는 `custom`으로 전환된다.
4. `custom`일 때만 사이드바의 테이블 이름 입력칸이 보인다.
5. `custom` 입력값은 보존된다.
6. `custom` 입력 중 `비료` 또는 `농약`을 다시 누르면 입력칸은 숨겨지지만, 기존 입력값은 유지된다.
7. `custom` 상태에서 이름이 비어 있으면 저장은 비활성화된다.
8. `custom` 상태에서는 static merge가 실행되지 않는다.
9. `비료`, `농약` 상태에서는 기존처럼 업로드 후 자동 static merge가 실행된다.

## Interaction Flow

### Default category flow

- 사용자가 `비료` 또는 `농약` 카드를 클릭한다.
- 현재 카테고리 모드는 각각 `fertilizer`, `pesticide`가 된다.
- 테이블 이름 입력칸은 숨겨진다.
- 업로드 시 `extract + auto static merge` 흐름을 사용한다.
- 저장 시 카테고리명은 각각 `비료`, `농약`으로 저장된다.

### Additional category flow

- 사용자가 `+ 추가` 카드를 클릭한다.
- 현재 카테고리 모드는 `custom`이 된다.
- 사이드바에 테이블 이름 입력칸이 나타난다.
- 사용자는 이름을 입력해 추가 카테고리를 정의한다.
- 업로드는 이름 입력 전에도 허용된다.
- 저장은 이름 입력 후에만 가능하다.
- 업로드 시 `extract only` 흐름을 사용한다.

## Architecture

### Page state

- `tableNameMode`는 page가 소유한다.
- `customTableName`도 page가 소유한다.
- page는 카드 클릭과 `+ 추가` 클릭에 따라 이 두 상태를 바꾼다.

### Catalog model

- 카탈로그 카드 모델은 기존 정보를 유지한다.
- 여기에 아래 메타만 추가한다.
  - `isSelectable`
  - `selectionMode`
- `+ 추가` 카드는 `selectionMode: 'custom'`을 가진다.

### Save hook

- save hook은 UI 표시 책임을 가지지 않는다.
- `tableNameMode`와 `customTableName`을 입력으로 받아 저장 가능한지와 최종 카테고리명을 계산한다.

### Merge control

- auto static merge 구조는 유지한다.
- 단지 `tableNameMode`가 `fertilizer` 또는 `pesticide`일 때만 활성화된다.
- `custom`일 때는 비활성이다.

## UI Behavior

- 초기 상태에서는 테이블 이름 입력칸을 숨긴다.
- `+ 추가`를 클릭한 경우에만 입력칸을 렌더한다.
- `비료`, `농약` 중 현재 선택된 카드는 선택 상태 스타일을 가진다.
- `+ 추가`도 선택된 경우 동일한 선택 상태를 가진다.

## Testing

- 초기 렌더에서 입력칸이 숨겨지는지 확인한다.
- `+ 추가` 클릭 시 입력칸이 나타나는지 확인한다.
- `비료` 또는 `농약` 클릭 시 입력칸이 숨겨지는지 확인한다.
- `+ 추가`로 입력한 값이 다시 `+ 추가`를 눌렀을 때 유지되는지 확인한다.
- `custom`에서 이름이 비어 있으면 저장이 비활성인지 확인한다.
- `custom`에서는 auto merge가 실행되지 않는지 확인한다.
