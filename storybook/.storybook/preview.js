import React from 'react';
import { lightTheme, darkTheme } from '@backstage/theme';
import { CssBaseline, ThemeProvider } from '@material-ui/core';
import { apis } from './apis';

import { Content, AlertDisplay } from '@backstage/core-components';
import { TestApiProvider } from '@backstage/test-utils';

const useDarkMode = false;

export const decorators = [
  Story => (
    <TestApiProvider apis={apis}>
      <ThemeProvider theme={useDarkMode ? darkTheme : lightTheme}>
        <CssBaseline>
          <AlertDisplay />
          <Content>
            <Story />
          </Content>
        </CssBaseline>
      </ThemeProvider>
    </TestApiProvider>
  ),
];

export const parameters = {
  darkMode: {
    // Set the initial theme
    current: 'light',
  },
  layout: 'fullscreen',
  options: {
    storySort: {
      order: ['Plugins', 'Layout', 'Navigation'],
    },
  },
};
