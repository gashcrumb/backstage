/*
 * Copyright 2025 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { RemoteSharedDependencies } from './types';

/**
 * Returns the npm package name for a shared import path (handles scoped packages and subpath exports).
 *
 * @public
 */
export function getPackageNameFromSharedImportPath(importPath: string): string {
  return importPath.startsWith('@')
    ? importPath.split('/').slice(0, 2).join('/')
    : importPath.split('/')[0]!;
}

/**
 * Resolves concrete `version` fields for remote shared dependencies by reading each package’s
 * `package.json` under `packageDir`. If a package cannot be resolved, the entry is returned unchanged
 * (no `version`), matching previous remote behavior.
 *
 * @public
 */
export function resolveRemoteSharedDependencyVersions(
  packageDir: string,
  sharedDependencies: RemoteSharedDependencies,
): RemoteSharedDependencies {
  return Object.fromEntries(
    Object.entries(sharedDependencies).map(([importPath, sharedDep]) => {
      if (!sharedDep) {
        return [importPath, sharedDep];
      }
      const moduleName = getPackageNameFromSharedImportPath(importPath);
      try {
        const packageJsonPath = require.resolve(`${moduleName}/package.json`, {
          paths: [packageDir],
        });
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const version = require(packageJsonPath).version as string;
        return [importPath, { ...sharedDep, version }];
      } catch {
        return [importPath, sharedDep];
      }
    }),
  );
}
