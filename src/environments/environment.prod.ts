export const environment = {
  production: true,
  get apiUrl(): string {
    return (window as any).__env?.API_URL || '';
  },
  get frontendUrl(): string {
    return (window as any).__env?.FRONTEND_URL || '';
  }
};
