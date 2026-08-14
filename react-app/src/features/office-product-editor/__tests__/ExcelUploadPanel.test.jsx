import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExcelUploadPanel } from '../components/data-edit-controls/ExcelUploadPanel';

describe('ExcelUploadPanel', () => {
  it('renders upload controls on the left and warnings on the right', () => {
    render(
      <ExcelUploadPanel
        onWorkbookChange={vi.fn()}
        isLoading={false}
        loadingErrorMessage=""
        fileWarnings={['시트 이름이 비어 있습니다']}
        warningRows={[
          {
            product_code: 'A100',
            product_name: 'Alpha',
            sale_price_type_code: '01',
            warnings: ['가격이 0입니다'],
          },
        ]}
      />
    );

    expect(screen.getByText('📂 파일 선택')).toBeInTheDocument();
    expect(screen.getByTestId('excel-upload-dropzone')).toBeInTheDocument();
    expect(screen.getByText('파일 경고')).toBeInTheDocument();
    expect(screen.getByText('행 경고')).toBeInTheDocument();
    expect(screen.queryByText('표시할 경고가 없습니다')).not.toBeInTheDocument();
  });

  it('shows an empty-state message in the right column when there are no warnings', () => {
    render(
      <ExcelUploadPanel
        onWorkbookChange={vi.fn()}
        isLoading={false}
        loadingErrorMessage=""
        fileWarnings={[]}
        warningRows={[]}
      />
    );

    expect(screen.getByText('표시할 경고가 없습니다')).toBeInTheDocument();
    expect(screen.queryByText('파일 경고')).not.toBeInTheDocument();
    expect(screen.queryByText('행 경고')).not.toBeInTheDocument();
  });

  it('forwards dropped files to onWorkbookChange using the same event shape as the file input', () => {
    const onWorkbookChange = vi.fn();
    render(
      <ExcelUploadPanel
        onWorkbookChange={onWorkbookChange}
        isLoading={false}
        loadingErrorMessage=""
        fileWarnings={[]}
        warningRows={[]}
      />
    );

    const file = new File(['dummy'], 'workbook.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const dropzone = screen.getByTestId('excel-upload-dropzone');

    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    expect(onWorkbookChange).toHaveBeenCalledTimes(1);
    const eventArg = onWorkbookChange.mock.calls[0][0];
    expect(eventArg.target.files[0]).toBe(file);
  });
});
