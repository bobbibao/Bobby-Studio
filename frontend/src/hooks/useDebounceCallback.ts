import { useRef, useCallback, useState } from 'react';

export function useDebounceCallback<CallbackArgs extends any[]>(
  callback: (...args: CallbackArgs) => void,
  wait = 300,
  leading = false
): (...args: CallbackArgs) => void {
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leadingCalled = useRef(false);

  return useCallback((...args: CallbackArgs) => {
    if (timeout.current) {
      clearTimeout(timeout.current);
    }

    if (leading && !leadingCalled.current) {
      callback(...args);
      leadingCalled.current = true;
      timeout.current = setTimeout(() => {
        leadingCalled.current = false;
      }, wait);
    } else if (!leading) {
      timeout.current = setTimeout(() => {
        callback(...args);
      }, wait);
    }
  }, [callback, wait, leading]);
}

export function useDebounce<State>(
  initialState: State | (() => State),
  wait = 300,
  leading = false
): [
  State,
  React.Dispatch<React.SetStateAction<State>>,
  React.Dispatch<React.SetStateAction<State>>
] {
  const [state, setState] = useState(initialState);
  const setDebouncedState = useDebounceCallback(setState, wait, leading);

  return [state, setState, setDebouncedState];
}

