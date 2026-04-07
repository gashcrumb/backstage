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

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  getPackageNameFromSharedImportPath,
  resolveRemoteSharedDependencyVersions,
} from './resolveRemoteSharedDependencyVersions';
import type { RemoteSharedDependencies } from './types';

async function installFakePackage(
  root: string,
  packageName: string,
  version: string,
) {
  const segments = packageName.split('/');
  const dir = join(root, 'node_modules', ...segments);
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify({ name: packageName, version }),
  );
}

describe('getPackageNameFromSharedImportPath', () => {
  it('returns the first segment for unscoped paths', () => {
    expect(getPackageNameFromSharedImportPath('react')).toBe('react');
    expect(getPackageNameFromSharedImportPath('react/jsx-runtime')).toBe(
      'react',
    );
  });

  it('returns scope and name for scoped paths', () => {
    expect(getPackageNameFromSharedImportPath('@mui/material')).toBe(
      '@mui/material',
    );
    expect(getPackageNameFromSharedImportPath('@mui/material/styles')).toBe(
      '@mui/material',
    );
  });
});

describe('resolveRemoteSharedDependencyVersions', () => {
  let fixtureRoot: string | undefined;

  afterEach(async () => {
    if (fixtureRoot) {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
    fixtureRoot = undefined;
  });

  it('adds version from package.json for subpath shared keys', async () => {
    fixtureRoot = await mkdtemp(join(tmpdir(), 'mf-remote-resolve-'));
    await installFakePackage(fixtureRoot, '@mui/material', '5.14.2');

    const input: RemoteSharedDependencies = {
      '@mui/material/styles': {
        singleton: true,
        eager: false,
        import: false,
        requiredVersion: '*',
      },
    };

    const out = resolveRemoteSharedDependencyVersions(fixtureRoot, input);

    expect(out['@mui/material/styles']).toEqual({
      singleton: true,
      eager: false,
      import: false,
      requiredVersion: '*',
      version: '5.14.2',
    });
  });

  it('resolves unscoped packages', async () => {
    fixtureRoot = await mkdtemp(join(tmpdir(), 'mf-remote-resolve-'));
    await installFakePackage(fixtureRoot, 'react', '18.2.0');

    const input: RemoteSharedDependencies = {
      react: {
        singleton: true,
        eager: false,
        import: false,
        requiredVersion: '*',
      },
    };

    const out = resolveRemoteSharedDependencyVersions(fixtureRoot, input);

    expect(out.react).toMatchObject({ version: '18.2.0' });
  });

  it('leaves entries unchanged when the package cannot be resolved', async () => {
    fixtureRoot = await mkdtemp(join(tmpdir(), 'mf-remote-resolve-'));

    const input: RemoteSharedDependencies = {
      '@missing/dep/subpath': {
        singleton: true,
        eager: false,
        import: false,
        requiredVersion: '*',
      },
    };

    const out = resolveRemoteSharedDependencyVersions(fixtureRoot, input);

    expect(out['@missing/dep/subpath']).toEqual(input['@missing/dep/subpath']);
    expect(out['@missing/dep/subpath']).not.toHaveProperty('version');
  });
});
