import { useId } from 'react';
import type { ReactElement, ReactNode } from 'react';
import styles from './form.module.scss';

interface FormSectionProps {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly className?: string;
}
function FormSection({ title, description, children, className }: FormSectionProps): ReactElement {
  const id = useId();
  return (
    <section className={[styles.section, className].filter(Boolean).join(' ')} aria-labelledby={id}>
      <header>
        <h3 id={id}>{title}</h3>
        {description !== undefined && <p>{description}</p>}
      </header>
      {children}
    </section>
  );
}
export { FormSection, type FormSectionProps };
