'use client';

import { useEffect, useState } from 'react';
import type { FormResult } from '@/lib/types';

export type LiveFormsMap = Record<string, FormResult[]>;

let _cache: LiveFormsMap | null = null;
let _promise: Promise<LiveFormsMap | null> | null = null;

function loadForms(): Promise<LiveFormsMap | null> {
  if (_cache) return Promise.resolve(_cache);
  if (!_promise) {
    _promise = fetch('/api/fotmob/wc-forms')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { forms?: LiveFormsMap } | null) => {
        if (data?.forms) {
          _cache = data.forms;
          return _cache;
        }
        return null;
      })
      .catch(() => null);
  }
  return _promise;
}

export function useLiveForms(): LiveFormsMap | null {
  const [forms, setForms] = useState<LiveFormsMap | null>(_cache);

  useEffect(() => {
    if (_cache) {
      setForms(_cache);
      return;
    }
    loadForms().then((f) => {
      if (f) setForms(f);
    });
  }, []);

  return forms;
}
