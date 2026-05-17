'use client';

import { useEffect, useState } from 'react';

export function useTypewriter(text: string, enabled: boolean, charsPerTick = 3, ms = 16) {
  const [display, setDisplay] = useState(enabled ? '' : text);

  useEffect(() => {
    if (!enabled) {
      setDisplay(text);
      return;
    }
    setDisplay('');
    let i = 0;
    const t = setInterval(() => {
      i += charsPerTick;
      setDisplay(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, ms);
    return () => clearInterval(t);
  }, [text, enabled, charsPerTick, ms]);

  return { display, isTyping: enabled && display.length < text.length };
}
