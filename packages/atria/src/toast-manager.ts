import { Toast as Primitive } from '@base-ui/react/toast';
import type { UseToastManagerReturnValue } from '@base-ui/react/toast';

type ToastData = Record<string, string>;
function useToast(): UseToastManagerReturnValue<ToastData> {
  return Primitive.useToastManager<ToastData>();
}

export { useToast };
