export type TodoErrorStoreState = {
  errorMessage: string | null;
  setErrorMessage: (message: string) => void;
  clearErrorMessage: () => void;
  setUnknownErrorMessage: (error: unknown) => void;
};
