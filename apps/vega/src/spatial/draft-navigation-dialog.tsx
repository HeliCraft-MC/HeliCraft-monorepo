import type { ReactElement } from 'react';
import { Button, Dialog } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import type { useDraftNavigation } from './use-draft-navigation';
import styles from './territory-editor.module.scss';

function DraftNavigationDialog({
  navigation,
}: Readonly<{ navigation: ReturnType<typeof useDraftNavigation> }>): ReactElement {
  const { locale } = useTranslation();
  const { changeOpen: handleOpenChange, cancel: handleCancel, confirm: handleConfirm } = navigation;
  return (
    <Dialog
      open={navigation.pending !== null}
      onOpenChange={handleOpenChange}
      title={uiText(locale, 'Покинуть текущий черновик?', 'Leave this draft?')}
      description={uiText(
        locale,
        'Изменения ещё не сохранены или сохранение не завершилось. При переходе несохранённые правки будут потеряны. Можно остаться, дождаться сохранения или исправить ошибку.',
        'Your changes are unsaved or saving has not finished. Continuing discards any unsaved edits. Stay here to wait for saving or resolve the error.',
      )}
      closeLabel={uiText(locale, 'Закрыть', 'Close')}
    >
      <div className={styles.toolbar}>
        <Button onClick={handleCancel}>
          {uiText(locale, 'Остаться в редакторе', 'Keep editing')}
        </Button>
        <Button tone="quiet" onClick={handleConfirm}>
          {uiText(locale, 'Продолжить без сохранения', 'Continue without saving')}
        </Button>
      </div>
    </Dialog>
  );
}
export { DraftNavigationDialog };
