import path from 'path';
import WebpackPluginFailBuildOnWarning from './webpack-plugin-fail-build-on-warning';
/**
 * This set of stories are the ones that we publish to backstage.io.
 */
const BACKSTAGE_CORE_STORIES = [
  'packages/core-components',
  'packages/app',
  'plugins/org',
  'plugins/search',
  'plugins/search-react',
  'plugins/home',
  'plugins/stack-overflow',
  'plugins/catalog-react',
];

// Some configuration needs to be available directly on the exported object
const staticConfig = {
  docs: { autodocs: true },
  framework: {
    name: '@storybook/react-webpack5',
    options: {
      builder: {
        useSWC: true,
      },
    },
  },
  addons: [
    '@storybook/addon-controls',
    '@storybook/addon-a11y',
    '@storybook/addon-actions',
    '@storybook/addon-links',
    '@storybook/addon-storysource',
  ],
};

module.exports = Object.assign(({ args }) => {
  // Calling storybook with no args causes our default list of stories to be used.
  // This set of stories are the ones that we publish to backstage.io
  //
  // If it's called with args, each arg should be the path to a package that we will
  // show the stories from, for example `yarn storybook plugins/catalog`.

  const rootPath = '../../';
  const storiesSrcGlob = 'src/**/*.stories.tsx';

  const getStoriesPath = pkg => path.posix.join(rootPath, pkg, storiesSrcGlob);

  const packages = args.length === 0 ? BACKSTAGE_CORE_STORIES : args;
  const stories = packages.map(getStoriesPath);

  return {
    ...staticConfig,
    stories,
    webpackFinal: async config => {
      // Mirror config in packages/cli/src/lib/bundler
      config.resolve.mainFields = ['browser', 'module', 'main'];
      config.resolve.extensions.push('.ts', '.tsx');

      config.module.rules.push(
        {
          test: /\.(tsx?)$/,
          exclude: /node_modules/,
          loader: require.resolve('swc-loader'),
          options: {
            jsc: {
              target: 'es2019',
              parser: {
                syntax: 'typescript',
                tsx: true,
                dynamicImport: true,
              },
              transform: {
                react: {
                  runtime: 'automatic',
                },
              },
            },
          },
        },
        {
          test: /\.(jsx?|mjs|cjs)$/,
          exclude: /node_modules/,
          loader: require.resolve('swc-loader'),
          options: {
            jsc: {
              target: 'es2019',
              parser: {
                syntax: 'ecmascript',
                jsx: true,
                dynamicImport: true,
              },
              transform: {
                react: {
                  runtime: 'automatic',
                },
              },
            },
          },
        },
      );

      // Disable ProgressPlugin which logs verbose webpack build progress. Warnings and Errors are still logged.
      config.plugins = config.plugins.filter(
        ({ constructor }) => constructor.name !== 'ProgressPlugin',
      );

      // Fail storybook build on CI if there are webpack warnings.
      if (process.env.CI) {
        config.plugins.push(new WebpackPluginFailBuildOnWarning());
      }

      return config;
    },
  };
}, staticConfig);
