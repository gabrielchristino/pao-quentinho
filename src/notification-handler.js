/**
 * Este script lida com o clique em notificações push, garantindo que o PWA
 * seja aberto ou focado, mesmo quando o aplicativo está fechado.
 */

// Adiciona um ouvinte de eventos para o clique na notificação.
self.addEventListener('notificationclick', (event) => {
  // Fecha a notificação assim que ela é clicada.
  event.notification.close();

  // Obtém a URL dos dados da notificação (enviada pelo backend).
  const urlToOpen = event.notification.data?.url;

  if (!urlToOpen) {
    console.error('Nenhuma URL encontrada nos dados da notificação.');
    return;
  }

  // Usa `clients.openWindow()` para abrir a URL. Este método é a forma
  // correta de abrir uma nova janela a partir de um Service Worker,
  // garantindo que o PWA seja focado se já estiver aberto, ou aberto em
  // uma nova janela se estiver fechado.
  event.waitUntil(
    clients.openWindow(urlToOpen)
  );
});