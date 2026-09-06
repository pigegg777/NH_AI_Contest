import { useEffect, useState } from 'react';

export default function useObservedElementHeight(
  targetRef,
  enabled = true,
  deps = [],
) {
  const [height, setHeight] = useState(null);

  useEffect(() => {
    const targetElement = targetRef?.current;

    if (!enabled || !targetElement) {
      setHeight(null);
      return undefined;
    }

    const updateHeight = () => {
      setHeight(targetElement.getBoundingClientRect().height || null);
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }

    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    resizeObserver.observe(targetElement);
    window.addEventListener('resize', updateHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [enabled, targetRef, ...deps]);

  return height;
}
