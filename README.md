# Pão Quentinho - Frontend (PWA)

Este é o frontend da aplicação "Pão Quentinho", um **Progressive Web App (PWA)** construído com Angular. A aplicação permite que os usuários encontrem estabelecimentos (como padarias e mercados) próximos e se inscrevam para receber notificações push sobre novas fornadas de pão.

## Funcionalidades

- **Progressive Web App (PWA)**: A aplicação pode ser "instalada" na tela inicial de dispositivos móveis e desktops, funcionando de forma semelhante a um aplicativo nativo e com capacidades offline.
- **Geolocalização**: Utiliza a localização do usuário para listar e ordenar os estabelecimentos por proximidade.
- **Notificações Push**: Permite que os usuários se inscrevam para receber alertas em tempo real dos seus estabelecimentos favoritos.
- **Design Responsivo**: Interface adaptada para uma ótima experiência em celulares, tablets e computadores.

## Tecnologias Utilizadas

- **Angular**: Framework principal para a construção da interface.
- **Angular Service Worker**: Para funcionalidades de PWA, como cache offline e notificações push.
- **TypeScript**: Linguagem de programação principal.
- **SCSS**: Para estilização.

## Começando

### Pré-requisitos

- Node.js (versão 22.0.0 ou superior)
- Angular CLI (`npm install -g @angular/cli`)
- Uma instância do Pão Quentinho - Backend deve estar em execução.

### Instalação

1.  Navegue até a pasta do frontend:
    ```bash
    cd pao-quentinho
    ```
2.  Instale as dependências do projeto:
    ```bash
    npm install
    ```

### Configuração do Ambiente

A aplicação se conecta ao backend para buscar dados e se registrar para notificações. A URL do backend é configurada nos arquivos de ambiente do Angular.

Verifique o arquivo `src/environments/environment.ts` e, se necessário, o `src/environments/environment.prod.ts` para garantir que a variável `apiUrl` aponta para o endereço correto do seu backend.

**Exemplo (`src/environments/environment.ts`):**
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api' // URL para desenvolvimento local
};
```

**Exemplo (`src/environments/environment.prod.ts`):**
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://pao-quentinho-backend-production.up.railway.app/api' // URL de produção
};
```

### Rodando a Aplicação

-   **Para Desenvolvimento:**
    Execute o comando abaixo para iniciar o servidor de desenvolvimento do Angular. A aplicação estará disponível em `http://localhost:4200/`.
    ```bash
    ng serve
    ```

-   **Para Produção:**
    Para criar uma versão otimizada para produção, use o comando de build.
    ```bash
    ng build --configuration production
    ```
    Os arquivos gerados estarão na pasta `dist/pao-quentinho/browser/`. Você pode então servir esses arquivos estáticos usando um servidor web como Nginx ou Apache, ou hospedá-los em serviços como GitHub Pages, Vercel ou Netlify.

---