import React, { forwardRef, MutableRefObject, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Textarea, TextareaProps } from '@chakra-ui/react';

type AutoResizeTextAreaProps = TextareaProps & {
  autoResize?: boolean;
};

const AutoResizeTextArea = forwardRef<HTMLTextAreaElement, AutoResizeTextAreaProps>(
  ({ autoResize = true, onChange, value, resize, overflowY, ...rest }, forwardedRef) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const rafRef = useRef<number>();
    const minHeightProp = (rest as any)?.minH ?? (rest as any)?.minHeight;

    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          (forwardedRef as MutableRefObject<HTMLTextAreaElement | null>).current = node;
        }
      },
      [forwardedRef]
    );

    const resolveMinHeight = (textarea: HTMLTextAreaElement) => {
      if (typeof minHeightProp === 'number') {
        return minHeightProp;
      }
      if (typeof minHeightProp === 'string') {
        const parsed = parseFloat(minHeightProp);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
      const computedValue = window.getComputedStyle(textarea).minHeight;
      const parsedComputed = parseFloat(computedValue);
      return Number.isNaN(parsedComputed) ? 0 : parsedComputed;
    };

    const adjustHeight = useCallback(() => {
      if (!autoResize) return;
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.style.height = 'auto';
      const minHeightPx = resolveMinHeight(textarea);
      const nextHeight = Math.max(textarea.scrollHeight, minHeightPx);
      textarea.style.height = `${nextHeight}px`;
    }, [autoResize, minHeightProp]);

    useLayoutEffect(() => {
      adjustHeight();
    }, [adjustHeight, value]);

    useEffect(() => {
      adjustHeight();
    }, []);

    useEffect(() => {
      return () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }, []);

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(event);

      if (!autoResize) return;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(adjustHeight);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Allow arrow keys to work normally for text navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.stopPropagation();
      }
      // Call original onKeyDown if it exists
      if (rest.onKeyDown) {
        rest.onKeyDown(event);
      }
    };

    const controlledValueProps = typeof value !== 'undefined' ? { value } : {};

    return (
      <Textarea
        {...rest}
        {...controlledValueProps}
        ref={setRefs}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        resize={resize ?? 'none'}
        overflowY={overflowY ?? 'hidden'}
      />
    );
  }
);

AutoResizeTextArea.displayName = 'AutoResizeTextArea';

export default AutoResizeTextArea;

