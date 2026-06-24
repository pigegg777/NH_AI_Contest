# Auth Register Business Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회원가입 폼에 필수 사업장 코드 입력을 추가하고 Supabase `login_users` insert에 `business_code`를 저장한다.

**Architecture:** `RegisterPage.jsx`는 새 입력값을 로컬 상태로 관리하고, `authService.register()`는 이를 `business_code` 컬럼으로 매핑한다. 스키마 기준 파일도 함께 갱신해 새 환경에서도 동일한 데이터 구조를 재현한다.

**Tech Stack:** React 19, Vite, Vitest, Testing Library, Supabase JS

---

### Task 1: Register Page Test First

**Files:**
- Create: `react-app/src/features/auth/pages/RegisterPage.test.jsx`
- Modify: `react-app/src/features/auth/pages/RegisterPage.jsx`

- [ ] **Step 1: Write the failing UI test**

```jsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import RegisterPage from './RegisterPage';

const registerMock = vi.fn();

vi.mock('../services/authService', () => ({
  register: (...args) => registerMock(...args),
}));

it('submits businessCode with the registration form', async () => {
  registerMock.mockResolvedValue({ id: 1 });
  const onGoLogin = vi.fn();

  render(<RegisterPage onGoLogin={onGoLogin} />);

  fireEvent.change(screen.getByLabelText('사업장 코드'), {
    target: { value: 'A001' },
  });

  fireEvent.submit(screen.getByRole('button', { name: '가입하기' }).closest('form'));

  expect(registerMock).toHaveBeenCalledWith(
    expect.objectContaining({ businessCode: 'A001' }),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npm run test:run -- src/features/auth/pages/RegisterPage.test.jsx`
Expected: FAIL because the label or submitted payload does not include `businessCode`

- [ ] **Step 3: Write minimal page implementation**

```jsx
const [form, setForm] = useState({
  nhName: '',
  officeName: '',
  businessCode: '',
  name: '',
  employeeId: '',
  password: '',
});

<label htmlFor="businessCode">사업장 코드</label>
<input
  id="businessCode"
  name="businessCode"
  required
  value={form.businessCode}
  onChange={handleChange}
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npm run test:run -- src/features/auth/pages/RegisterPage.test.jsx`
Expected: PASS

### Task 2: Auth Service Payload Test First

**Files:**
- Create: `react-app/src/features/auth/services/authService.test.js`
- Modify: `react-app/src/features/auth/services/authService.js`

- [ ] **Step 1: Write the failing service test**

```js
import { describe, expect, it, vi } from 'vitest';
import supabase from '../../../lib/supabaseClient';
import { register } from './authService';

vi.mock('../../../lib/supabaseClient', () => ({
  default: {
    from: vi.fn(),
  },
}));

it('maps businessCode to business_code during insert', async () => {
  const single = vi.fn().mockResolvedValue({ data: { id: 1 }, error: null });
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  supabase.from.mockReturnValue({ insert });

  await register({
    nhName: 'NH',
    officeName: '본점',
    businessCode: 'A001',
    name: '홍길동',
    employeeId: '1001',
    password: 'pw',
  });

  expect(insert).toHaveBeenCalledWith(
    expect.objectContaining({ business_code: 'A001' }),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd react-app && npm run test:run -- src/features/auth/services/authService.test.js`
Expected: FAIL because insert payload omits `business_code`

- [ ] **Step 3: Write minimal service implementation**

```js
export async function register({
  nhName,
  officeName,
  businessCode,
  name,
  employeeId,
  password,
}) {
  const { data, error } = await supabase
    .from('login_users')
    .insert({
      nh_name: nhName,
      office_name: officeName,
      business_code: businessCode,
      name,
      employee_id: employeeId,
      password,
    })
    .select('id')
    .single();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd react-app && npm run test:run -- src/features/auth/services/authService.test.js`
Expected: PASS

### Task 3: Schema Alignment and Regression Verification

**Files:**
- Modify: `react-app/supabase_setup.sql`
- Test: `react-app/src/features/auth/pages/RegisterPage.test.jsx`
- Test: `react-app/src/features/auth/services/authService.test.js`

- [ ] **Step 1: Update schema definition**

```sql
CREATE TABLE IF NOT EXISTS public.login_users (
  id            bigint generated always as identity primary key,
  nh_name       text not null,
  office_name   text not null,
  business_code text not null,
  name          text not null,
  employee_id   text not null,
  password      text not null,
  created_at    timestamptz default now()
);
```

- [ ] **Step 2: Run targeted tests**

Run: `cd react-app && npm run test:run -- src/features/auth/pages/RegisterPage.test.jsx src/features/auth/services/authService.test.js`
Expected: PASS

- [ ] **Step 3: Run build verification**

Run: `cd react-app && npm run build`
Expected: build succeeds with exit code 0
