import { useState } from 'react';

import { requestAiImageList } from '../../services/ai-image-apply/aiImageApplyClient';

export function useImageStoragePicker({ rowId, officeCode, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleOpen() {
    setIsOpen(true);
    setIsLoading(true);
    setError('');

    try {
      const { images: fetchedImages } = await requestAiImageList({ officeCode });
      setImages(fetchedImages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 목록을 불러오지 못했습니다.');
      setImages([]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleClose() {
    setIsOpen(false);
  }

  function handleSelect(image) {
    onSelect(rowId, image.url);
    setIsOpen(false);
  }

  return { isOpen, images, isLoading, error, handleOpen, handleClose, handleSelect };
}
