import type { ReactElement } from 'react';
import type { SpatialWorld } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';

function WorldStatus({ worlds }: Readonly<{ worlds?: readonly SpatialWorld[] }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <>
      <h2>{uiText(locale, 'Подключённые миры', 'Connected worlds')}</h2>
      <p>
        {uiText(
          locale,
          'Обычный мир (Overworld) подключается автоматически при запуске Денеба. Вводить UUID и измерение не нужно. После запуска Minecraft-сервера подождите несколько секунд — мир появится в списке ниже.',
          'The primary Overworld connects automatically when Deneb starts. No UUID or dimension entry is needed. Wait a few seconds after starting Minecraft for the world to appear below.',
        )}
      </p>
      {worlds?.length === 0 ? (
        <Alert>
          {uiText(
            locale,
            'Подключённых миров пока нет. Проверьте, что Minecraft-сервер запущен и Денеб подключён к Антаресу.',
            'No worlds are connected yet. Check that Minecraft is running and Deneb can reach Antares.',
          )}
        </Alert>
      ) : null}
      <ul>
        {worlds?.map((world) => (
          <li key={world.id}>
            {displayText(world.name, locale)} ·{' '}
            <a href={`/map?world=${world.id}`}>{uiText(locale, 'Открыть карту', 'Open map')}</a>
          </li>
        ))}
      </ul>
      <p>
        {uiText(
          locale,
          'При обычном перезапуске границы сохраняются. Если создать мир заново, он подключится как новый: прежние границы останутся в истории старого мира и не перенесутся.',
          'A normal restart preserves boundaries. A recreated world connects as a new world: previous boundaries remain in the old world history and are not transferred.',
        )}
      </p>
    </>
  );
}
export { WorldStatus };
