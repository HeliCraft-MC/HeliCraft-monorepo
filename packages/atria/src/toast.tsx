import { Toast as Primitive } from '@base-ui/react/toast';
import type { ReactElement, ReactNode } from 'react';
import { ToastViewport } from './toast-viewport';

function ToastProvider({ children }: Readonly<{ children: ReactNode }>): ReactElement {
  return (
    <Primitive.Provider>
      {children}
      <ToastViewport />
    </Primitive.Provider>
  );
}
export { ToastProvider };
