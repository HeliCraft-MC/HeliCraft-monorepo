const galleryFields = ['title', 'description', 'alt', 'place'] as const;
function galleryTranslations(
  form: FormData,
): Record<string, Partial<Record<(typeof galleryFields)[number], string>>> {
  return Object.fromEntries(
    [
      ...new Set(
        [...form.keys()].flatMap((key) => {
          const match = /^translation:(?<language>[^:]+):title$/u.exec(key);
          const language = match?.groups?.language;
          return language === undefined ? [] : [language];
        }),
      ),
    ]
      .filter((language) => form.has(`translation:${language}:title`))
      .map((language) => [
        language,
        Object.fromEntries(
          galleryFields.map((field) => {
            const value = form.get(`translation:${language}:${field}`);
            return [field, typeof value === 'string' ? value : ''];
          }),
        ),
      ]),
  );
}
export { galleryTranslations };
