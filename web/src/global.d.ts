declare global {
  interface Window {
    google?: {
      script?: {
        run: GoogleScriptRun;
      };
    };
  }
}

type GoogleScriptRun = {
  withSuccessHandler<T>(handler: (value: T) => void): GoogleScriptRun;
  withFailureHandler(handler: (error: unknown) => void): GoogleScriptRun;
  [functionName: string]: unknown;
};

export {};
