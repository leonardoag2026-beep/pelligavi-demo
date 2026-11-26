export {};

declare global {
  interface Window {
    __PELLIGAVI_API__?: string;
    __studio3d?: any;
    __pz?: any;
    __pzDetalhe?: any;
    __pzVel?: any;
    __pzPerf?: any;
    __pzFolga?: any;
    __pzPerfil?: any;
    __forja?: any;
    __forno?: any;
  }

  interface HTMLElement {
    command?: string;
  }
}
