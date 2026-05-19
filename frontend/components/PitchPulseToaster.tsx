'use client';

import { Toaster } from 'sonner';

type ToasterPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

const TOAST_CLASS_NAMES = {
  toast: 'pp-toast',
  title: 'pp-toast__title',
  description: 'pp-toast__description',
  icon: 'pp-toast__icon',
  closeButton: 'pp-toast__close',
} as const;

export function PitchPulseToaster({
  position = 'bottom-right',
  expand = true,
}: {
  position?: ToasterPosition;
  expand?: boolean;
}) {
  return (
    <Toaster
      position={position}
      expand={expand}
      gap={10}
      offset={16}
      visibleToasts={4}
      closeButton
      toastOptions={{
        unstyled: true,
        classNames: TOAST_CLASS_NAMES,
      }}
    />
  );
}
