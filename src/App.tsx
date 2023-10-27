import esbuild from 'esbuild-wasm';
import path from 'path-browserify';
import './App.css';

const contentMap = new Map([
  [
    '@theme/markdoc/schema.ts',
    `export * from './tags/quiz.markdoc'
  export * from './tags/request-access-button.markdoc'
  export * from './tags/team-overview.markdoc'`,
  ],
  [
    '@theme/markdoc/tags/quiz.markdoc.ts',
    `import { Schema } from '@markdoc/markdoc';

  export const quiz: Schema & { tagName: string } = {
    attributes: {
      questions: {
        type: 'Object',
      },
    },
    render: 'Quiz', // please make sure to export it in components.ts,
    tagName: 'quiz',
  };`,
  ],
  [
    '@theme/markdoc/tags/request-access-button.markdoc.ts',
    `import { Schema } from '@markdoc/markdoc';

  export const requestAccessButton: Schema = {
    attributes: {
      appId: 'String'
    },
    render: 'RequestAccessButton', // please make sure to export it in components.ts,
    tagName: 'request-access-button'
  };`,
  ],
  [
    '@theme/markdoc/tags/team-overview.markdoc.ts',
    `import { Schema } from '@markdoc/markdoc';

  export const teamOverview: Schema & { tagName: string } = {
    attributes: {
      members: {
        type: 'Object',
      },
    },
    render: 'TeamOverview', // please make sure to export it in components.ts,
    tagName: 'team-overview',
  };`,
  ],
]);

await esbuild.initialize({
  wasmURL: './node_modules/esbuild-wasm/esbuild.wasm',
  // worker: false,
});

function yfsPlugin(): esbuild.Plugin {
  return {
    name: 'yfs plugin',
    setup: (build: esbuild.PluginBuild) => {
      build.onResolve({ filter: /.*/ }, (args: esbuild.OnResolveArgs) => {
        switch (args.kind) {
          case 'entry-point':
            return { path: args.path, namespace: 'yfs' };
          case 'import-statement': {
            const dirname = path.dirname(args.importer);
            const absolutePath = path.join(dirname, args.path);

            return { path: absolutePath + '.ts', namespace: 'yfs' };
          }
          default:
            return null;
        }
      });

      build.onLoad(
        { filter: /.*/, namespace: 'yfs' },
        (args: esbuild.OnLoadArgs) => {
          if (contentMap.has(args.path)) {
            return Promise.resolve({
              contents: contentMap.get(args.path),
              loader: 'ts',
            });
          }

          return null;
        },
      );
    },
  };
}

async function bundle() {
  const buildResult = await esbuild.build({
    entryPoints: ['@theme/markdoc/schema.ts'],
    plugins: [yfsPlugin()],
    bundle: true,
    write: false,
    format: 'esm',
  });

  console.log(buildResult);

  const decoder = new TextDecoder();

  const code = decoder.decode(buildResult.outputFiles[0].contents);

  const dataUri = `data:text/javascript;charset=utf-8,${encodeURIComponent(
    code,
  )}`;
  const moduleObject = await import(dataUri);

  console.log(moduleObject);
  console.log(Object.entries(moduleObject));
}

function App() {
  return (
    <div>
      <button onClick={bundle}>Bundle</button>
    </div>
  );
}

export default App;
