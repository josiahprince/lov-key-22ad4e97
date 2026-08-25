export const logError = (context: string, error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[${context}] ${errorMessage}`, error);
};
