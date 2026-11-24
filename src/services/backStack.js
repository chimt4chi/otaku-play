import { useEffect, useRef } from 'react';

// Stack of "close me" handlers for things that should consume the Android back button
// (modals, drawers, fullscreen). The most recently opened one handles the press first.
const stack = [];

/** Calls the top handler. Returns true if something consumed the back press. */
export function handleBackPress() {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top.current();
  return true;
}

/** While `active`, back presses call `onBack` (latest closure) before any screen navigation. */
export function useBackHandler(active, onBack) {
  const ref = useRef(onBack);
  ref.current = onBack;

  useEffect(() => {
    if (!active) return undefined;
    stack.push(ref);
    return () => {
      const i = stack.lastIndexOf(ref);
      if (i !== -1) stack.splice(i, 1);
    };
  }, [active]);
}
