export const environment = {
  production: false,
  get apiUrl(): string {
    return (window as any).__env?.API_URL || 'http://localhost:3000/api';
  },
  get frontendUrl(): string {
    return (window as any).__env?.FRONTEND_URL || 'http://localhost:4200';
  }
};
