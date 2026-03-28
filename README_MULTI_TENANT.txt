SmartPark v7 - isolamento por cliente

1. Usuários já existentes sem tenantId continuam no tenant padrão (default).
2. Usuários criados dentro do sistema herdam o tenant atual.
3. Usuários autenticados fora do sistema, ao entrar sem perfil, recebem tenant próprio automaticamente (tenantId = uid).
4. Tenant padrão continua usando as coleções atuais.
5. Novos clientes isolados usam tenants/{tenantId}/...

Variável opcional no Vercel:
NEXT_PUBLIC_DEFAULT_TENANT_ID=default

Publique também as firestore.rules atualizadas.
