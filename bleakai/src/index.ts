export interface BleakaiConfig {
  url: string;
  headers?: Record<string, string>;
  toolRegistry?: Record<string, any>;
}

export class Bleakai {
  private url: string;
  private headers: Record<string, string>;
  private toolRegistry: Record<string, any>;

  constructor(config: BleakaiConfig) {
    this.url = config.url;
    this.headers = config.headers || {};
    this.toolRegistry = config.toolRegistry || {};
  }

  getUrl(): string {
    return this.url;
  }

  stream(): string {
    return this.url;
  }

  getHeaders(): Record<string, string> {
    return this.headers;
  }

  getToolRegistry(): Record<string, any> {
    return this.toolRegistry;
  }
}
