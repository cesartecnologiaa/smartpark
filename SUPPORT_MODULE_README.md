# Módulo de suporte SmartPark

## Arquivos criados

- `middleware.ts`
- `lib/support/firestore-rest.ts`
- `lib/support/session.ts`
- `app/api/support/login/route.ts`
- `app/api/support/logout/route.ts`
- `app/api/support/session/route.ts`
- `app/api/support/clients/route.ts`
- `app/api/support/clients/[id]/revoke/route.ts`
- `app/api/primeiro-acesso/route.ts`
- `app/suporte/login/page.tsx`
- `app/suporte/clientes/page.tsx`
- `app/suporte/clientes/ClientsManager.tsx`
- `app/primeiro-acesso/page.tsx`
- `SUPPORT_ENV.example`

## Rotas adicionadas

No App Router do Next.js, não é necessário registrar manualmente as novas rotas.
Elas passam a existir automaticamente pelos arquivos criados:

- `/suporte/login`
- `/suporte/clientes`
- `/primeiro-acesso`
- `/api/support/login`
- `/api/support/logout`
- `/api/support/session`
- `/api/support/clients`
- `/api/support/clients/[id]/revoke`
- `/api/primeiro-acesso`

## Regras para adicionar no firestore.rules

```txt
// client_tokens — acesso somente via backend de suporte
match /client_tokens/{docId} {
  allow read, write: if false;
}

// support_sessions — acesso somente via backend de suporte
match /support_sessions/{docId} {
  allow read, write: if false;
}
```

## Variáveis de ambiente

Adicione ao `.env`:

```env
SUPPORT_EMAIL=suporte@smartpark.com
SUPPORT_PASSWORD=senha_forte_aqui
SUPPORT_SESSION_SECRET=troque_esta_chave_por_uma_string_longa_e_unica
FIREBASE_PROJECT_ID=smartpark-3ef6a
FIREBASE_SERVICE_ACCOUNT_EMAIL=seu-service-account@projeto.iam.gserviceaccount.com
FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Como testar

1. Configure as variáveis acima.
2. Suba o projeto com `npm run dev`.
3. Acesse `/suporte/login`.
4. Entre com `SUPPORT_EMAIL` e `SUPPORT_PASSWORD`.
5. Em `/suporte/clientes`, clique em **Novo cliente**.
6. Gere um token e copie o valor exibido.
7. Acesse `/primeiro-acesso`.
8. Informe o token, senha e confirmação.
9. O sistema vai:
   - validar o token no backend;
   - criar o usuário no Firebase Auth;
   - gravar o perfil em `users/{uid}` com `tenantId` do token;
   - marcar o token como `UTILIZADO`.
10. Após isso, o usuário é redirecionado para `/`.

## Observações importantes

- O primeiro usuário criado por token entra como `admin` no `users/{uid}`.
- O módulo reutiliza `lib/firebase.ts` já existente.
- Nenhum arquivo existente foi alterado; apenas arquivos novos foram adicionados.
