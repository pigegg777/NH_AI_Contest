import { useId, useRef, useState } from 'react';
import SearchInput from '../../../common/components/SearchInput';
import { useNongyakFieldSuggestions } from '../hooks/useNongyakFieldSuggestions';
import styles from './NongyakSuggestField.module.css';

export default function NongyakSuggestField({
  id,
  tab,
  officeCode,
  field,
  value,
  onChange,
  placeholder,
  ...inputProps
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const listboxId = useId();

  const suggestions = useNongyakFieldSuggestions({ tab, officeCode, field, query: value });
  const showList = isOpen && value.trim().length > 0 && suggestions.length > 0;
  const activeOptionId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  const selectSuggestion = (suggestion) => {
    onChange(suggestion);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleChange = (nextValue) => {
    onChange(nextValue);
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (!showList) {
      if (event.key === 'ArrowDown' && suggestions.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
    } else if (event.key === 'Enter') {
      if (activeIndex >= 0) {
        event.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
      }
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleBlur = (event) => {
    if (containerRef.current && containerRef.current.contains(event.relatedTarget)) return;
    setIsOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div ref={containerRef} className={styles.wrap} onBlur={handleBlur}>
      <SearchInput
        id={id}
        value={value}
        onChange={handleChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        {...inputProps}
      />
      {showList ? (
        <ul id={listboxId} role="listbox" className={styles.listbox}>
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={[styles.option, index === activeIndex ? styles.optionActive : '']
                .filter(Boolean)
                .join(' ')}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectSuggestion(suggestion)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
