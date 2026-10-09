// oxlint-disable jsx-a11y/prefer-tag-over-role -- The inline SVG atlas needs its own accessible image role and title; it is authored vector markup.
import type { ReactElement } from 'react';
import { Link } from '@tanstack/react-router';
import type { HomeData } from './home-data';
import styles from './home.module.scss';

function HomeHero({ data }: Readonly<{ data: HomeData }>): ReactElement {
  const { site } = data;
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.heroText}>
        <p className={styles.eyebrow}>HeliCraft / Мир, который помнит</p>
        <h1 id="hero-title">
          Построй не просто дом.
          <br />
          <span>Оставь след</span>
          <br />в истории мира.
        </h1>
        <p className={styles.description}>
          Постоянный Minecraft-мир, где города, сообщества и решения игроков становятся частью общей
          истории.
        </p>
        <div className={styles.actions}>
          {site.registrationEnabled ? (
            <Link className={styles.primary} to="/register">
              Начать свою историю <span aria-hidden="true">↗</span>
            </Link>
          ) : (
            <Link className={styles.primary} to="/start">
              Узнать о запуске
            </Link>
          )}
          <Link className={styles.secondary} to="/world">
            Исследовать мир <span aria-hidden="true">→</span>
          </Link>
        </div>
        <p className={styles.caption}>Обычный Minecraft. Необычные возможности.</p>
        <p className={styles.phase}>
          <span aria-hidden="true">●</span>{' '}
          {site.phase === 'PRELAUNCH'
            ? 'Мир в разработке · веб-аккаунты уже доступны'
            : 'Мир открыт'}
        </p>
      </div>
      <figure className={styles.atlas}>
        <svg
          className={styles.scene}
          viewBox="0 0 560 600"
          role="img"
          aria-labelledby="atlas-title"
        >
          <title id="atlas-title">Авторский эскиз будущего мира: остров, башни и мост</title>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
            <linearGradient id="island" x1="0" x2="1" y1="0" y2="1">
              <stop stopColor="var(--accent-soft)" />
              <stop offset="1" stopColor="var(--bg-elevated)" />
            </linearGradient>
          </defs>
          <rect width="560" height="600" fill="url(#grid)" />
          <g fill="none" stroke="var(--border-strong)">
            <ellipse cx="280" cy="385" rx="250" ry="125" />
            <ellipse cx="280" cy="385" rx="225" ry="100" />
            <ellipse cx="280" cy="385" rx="198" ry="75" />
            <path d="M280 70V560M30 385H530" strokeDasharray="4 10" />
          </g>
          <g className={styles.island}>
            <path d="M90 330 280 220 480 335 290 455Z" fill="url(#island)" stroke="var(--accent)" />
            <path
              d="M90 330V365L290 490V455Z"
              fill="var(--bg-panel)"
              stroke="var(--border-strong)"
            />
            <path
              d="M290 455 480 335V370L290 490Z"
              fill="var(--bg-elevated)"
              stroke="var(--border-strong)"
            />
            <g fill="var(--primary-deep)" stroke="var(--primary)">
              <path d="M185 298V215L225 192 267 215V298L225 324Z" />
              <path d="M225 192V324M185 215 225 240 267 215" />
              <path d="M302 325V170L338 148 375 170V325L338 347Z" />
              <path d="M338 148V347M302 170 338 192 375 170" />
              <path d="M250 315 285 296 320 315 285 335Z" />
            </g>
            <g fill="var(--accent-soft)" stroke="var(--accent)">
              <path d="M140 345 168 300 195 345 168 362Z" />
              <path d="M389 351 419 294 449 351 419 369Z" />
            </g>
            <path
              d="M206 371 278 330 350 371"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="3"
            />
            <g fill="var(--text-primary)">
              <circle cx="225" cy="272" r="3" />
              <circle cx="338" cy="235" r="3" />
              <circle cx="338" cy="277" r="3" />
            </g>
          </g>
          <g fill="var(--text-muted)" fontFamily="var(--font-mono)" fontSize="11">
            <text x="20" y="40">
              АТЛАС / ЛИСТ 001
            </text>
            <text x="370" y="555">
              НАЧАЛО КООРДИНАТ
            </text>
            <text x="275" y="95">
              N
            </text>
          </g>
          <path
            d="M20 65V20H65M495 20H540V65M540 535V580H495M65 580H20V535"
            stroke="var(--primary)"
            fill="none"
          />
        </svg>
        <figcaption>Эскиз будущего мира / не снимок сервера</figcaption>
      </figure>
    </section>
  );
}
export { HomeHero };
