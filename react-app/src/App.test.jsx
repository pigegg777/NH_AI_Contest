import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from './App';

describe('App', () => {
  it('renders the fertilizer information heading', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: '발안농협 비료정보' }),
    ).toBeInTheDocument();
  });

  it('filters cards based on the search input', async () => {
    const user = userEvent.setup();

    render(<App />);

    const searchInput = await screen.findByRole('searchbox', { name: '상품명 검색' });

    await user.type(searchInput, '유기질');

    expect(await screen.findByRole('heading', { name: '유기질 비료' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '요소 비료' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '복합 비료' })).not.toBeInTheDocument();
  });
});
