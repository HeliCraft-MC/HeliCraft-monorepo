import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TranslationFields } from '../src/translation-fields';
import { LocaleProvider } from '../src/locale-provider';
import { galleryTranslations } from '../src/gallery-translations';

const originalValues = { title: 'Порт', alt: 'Причал' };
const translations = { en: { title: 'Harbour' }, de: { title: 'Hafen' } };
describe('language-selectable fields', () => {
  it('keeps one visible field set and submits edits in every language after switching', async () => {
    const user = userEvent.setup();
    const view = render(
      <LocaleProvider locale="ru">
        <form aria-label="Captions">
          <TranslationFields
            kind="gallery"
            originalLanguage="ru"
            originalValues={originalValues}
            values={translations}
          />
        </form>
      </LocaleProvider>,
    );
    expect(screen.getAllByRole('textbox')).toHaveLength(4);
    await user.clear(screen.getByLabelText('Название'));
    await user.type(screen.getByLabelText('Название'), 'Город');
    await user.selectOptions(screen.getByLabelText('Язык текста'), 'en');
    expect(screen.getAllByRole('textbox')).toHaveLength(4);
    await user.clear(screen.getByLabelText('Название'));
    await user.type(screen.getByLabelText('Название'), 'Town');
    await user.selectOptions(screen.getByLabelText('Язык текста'), 'de');
    expect(screen.getByLabelText('Название')).toHaveValue('Hafen');
    await user.selectOptions(screen.getByLabelText('Язык текста'), 'ru');
    expect(screen.getByLabelText('Название')).toHaveValue('Город');
    const form = view.container.querySelector('form');
    if (!form) {
      throw new Error('Form missing');
    }
    const data = new FormData(form);
    expect(data.get('title')).toBe('Город');
    expect(galleryTranslations(data).en?.title).toBe('Town');
    expect(data.get('translation:de:title')).toBe('Hafen');
  });
});
