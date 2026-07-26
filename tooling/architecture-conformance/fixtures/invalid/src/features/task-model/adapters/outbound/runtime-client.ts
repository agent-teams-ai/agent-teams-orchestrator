export interface RuntimeClient {
  start(): Promise<void>;
}

export const runtimeClient: RuntimeClient = {
  async start() {},
};
