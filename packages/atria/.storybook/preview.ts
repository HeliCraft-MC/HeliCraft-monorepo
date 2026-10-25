import type { Preview } from '@storybook/react-vite';
import { themes } from 'storybook/theming';
import '../src/styles.scss';
import './preview.scss';

const preview: Preview = {
  parameters: {
    layout: 'padded',
    a11y: { test: 'error' },
    controls: { expanded: true },
    docs: { theme: themes.dark, toc: true },
    options: {
      storySort: {
        order: [
          'Introduction',
          ['Welcome', 'Design principles', 'Contributing'],
          'Foundations',
          'Actions',
          'Forms',
          'Navigation',
          'Identity',
          'Data display',
          'Feedback',
          'Overlays',
          'Media',
          'Patterns',
        ],
      },
    },
  },
};
export default preview;
