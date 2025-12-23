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

  console.log('Notification Clicked. Action:', action, 'Data:', data);

  // Suporte para a estrutura onActionClick (Angular PWA / Novo Backend)
  if (data?.onActionClick) {
    // Se a ação for 'dismiss' (botão 'Agora não'), não fazemos nada (a notificação já fechou).
    if (action === 'dismiss') {
      return;
    }

    // Se uma ação específica foi clicada e possui uma URL, use-a.
    if (action && data.onActionClick[action]?.url) {
      urlToOpen = data.onActionClick[action].url;
      // DEBUG: Adiciona na URL para visualizarmos na barra de endereço do celular
      urlToOpen += (urlToOpen.includes('?') ? '&' : '?') + 'debug_source=BUTTON_' + action;
    } else {
      // Caso contrário, use a URL da ação padrão.
      // Isso cobre o clique no corpo da notificação ou em uma ação sem URL específica.
      urlToOpen = data.onActionClick['default']?.url;
      // DEBUG: Adiciona na URL para visualizarmos na barra de endereço do celular
      if (urlToOpen) urlToOpen += (urlToOpen.includes('?') ? '&' : '?') + 'debug_source=DEFAULT_BODY';
    }
  } else {
    // Fallback para estrutura antiga
    urlToOpen = data?.url;
  }

  if (!urlToOpen) {
    console.error('Nenhuma URL encontrada nos dados da notificação.');
    return;
  }

  // Garante que a URL seja absoluta para evitar problemas em alguns navegadores Android
  // ao clicar nos botões de ação.
  if (urlToOpen && !urlToOpen.startsWith('http')) {
    urlToOpen = new URL(urlToOpen, self.location.origin).href;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Tenta pegar a primeira janela disponível
      const client = windowClients[0];

      if (client && 'focus' in client) {
        return client.focus()
          .then((focusedClient) => focusedClient.navigate(urlToOpen))
          .catch(() => {
            // Se o foco falhar (ex: restrição do OS), tentamos abrir uma nova janela como fallback
            if (clients.openWindow) return clients.openWindow(urlToOpen);
          });
      }

      // Se não houver janela aberta, abre uma nova
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});