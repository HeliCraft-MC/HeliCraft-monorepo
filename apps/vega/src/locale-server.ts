import { createServerFn } from '@tanstack/react-start';
import { getCookie, setCookie } from '@tanstack/react-start/server';
import { z } from 'zod';
import { isLocale } from './locales';

const loadLocale = createServerFn({ method: 'GET' })
  .validator(z.string().nullable())
  .handler(({ data }) => {
    if (isLocale(data)) {
      setCookie('helicraft-language', data, { path: '/', maxAge: 31_536_000, sameSite: 'lax' });
    }
    const value = data ?? getCookie('helicraft-language');
    return isLocale(value) ? value : 'ru';
  });
export { loadLocale };
