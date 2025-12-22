/**
 * Este script lida com o clique em notificações push, garantindo que o PWA
 * seja aberto ou focado, mesmo quando o aplicativo está fechado.
 */

// Adiciona um ouvinte de eventos para o clique na notificação.
self.addEventListener('notificationclick', (event) => {
  // Fecha a notificação assim que ela é clicada.
  event.notification.close();

  // Obtém a URL dos dados da notificação (enviada pelo backend).
  const data = event.notification.data;
  const action = event.action;
  let urlToOpen;

  // Suporte para a estrutura onActionClick (Angular PWA / Novo Backend)
  if (data?.onActionClick) {
    if (action && data.onActionClick[action]) {
      urlToOpen = data.onActionClick[action].url;
    } else if (data.onActionClick['default']) {
      urlToOpen = data.onActionClick['default'].url;
    }
  } else {
    // Fallback para estrutura antiga
    urlToOpen = data?.url;
  }

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