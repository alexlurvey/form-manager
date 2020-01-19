import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import commonjs from 'rollup-plugin-commonjs';
import postcss from 'rollup-plugin-postcss';
import autoprefixer from 'autoprefixer';

export default {
  input: {
    'form-manager': 'form-manager/index.ts',
    'test-app': 'test-app/index.ts',
  },
  output: {
    dir: 'public',
    entryFileNames: '[name].js',
    format: 'es',
    sourcemap: true,
  },
  plugins: [
    resolve({ browser: true }),
    json(),
    typescript(),
    postcss({
      plugins: [ autoprefixer() ]
    }),
    commonjs(),
    replace({
      'process.env.NODE_ENV': JSON.stringify( 'development' )
    }),
  ],
};

