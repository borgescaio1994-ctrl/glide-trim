/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string;
}

declare module '*.svg?url' {
  const src: string;
  export default src;
}

declare module '*.png?url' {
  const src: string;
  export default src;
}
