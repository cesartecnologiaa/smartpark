## SmartPark v5

Tema ajustado para azul em vez de verde.

# SmartPark v5

Sistema SaaS fullstack para gestão de estacionamento com Next.js, TypeScript, Tailwind e Firebase.

## Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- Firebase Auth + Firestore
- Lucide React
- jsPDF + QRCode
- html5-qrcode

## Novidades da versão 3
- Cadastro de usuários pelo painel admin (`/usuarios`)
- Seed inicial de preços em `/configuracoes`
- Arquivos `firestore.rules` e `firestore.indexes.json`
- Scanner QR com câmera e leitura por imagem
- Controle de usuário inativo via Firestore
- Estrutura pronta para Git e Vercel

## Firebase já configurado
As credenciais web do Firebase já estão em `lib/firebase.ts`.

Projeto Firebase:
- `smartpark-3ef6a`

## Credenciais administrativas esperadas
Crie no Firebase Authentication:
- Email: `admin@parksmart.com`
- Senha: `Kimosabe`

Depois crie na collection `users` um documento com o UID desse usuário:

```json
{
  "name": "Cesar",
  "email": "admin@parksmart.com",
  "role": "admin",
  "active": true,
  "createdAt": "2026-03-12T00:00:00.000Z"
}
```

## Collections usadas
- `users`
- `priceSettings`
- `cashRegisters`
- `parkingTickets`
- `monthlyCustomers`

## Instalação local
```bash
npm install
npm run dev
```

## Deploy no Git
```bash
git init
git add .
git commit -m "smartpark enterprise v5"
```

## Deploy no Vercel
1. Suba o projeto para GitHub/GitLab/Bitbucket
2. Importe no Vercel
3. Faça o deploy

## Regras Firestore
Publique o arquivo `firestore.rules` no console do Firebase ou com Firebase CLI.

## Observações
- O Dashboard e Relatórios não usam dados hardcoded.
- Quando não houver dados no Firestore, a interface exibe `Nenhum registro`.
- Vendedor não vê Relatórios, Configurações nem Usuários.
- Entrada, Saída e recebimento de mensalista ficam bloqueados sem caixa aberto para o operador.
- A inativação de usuário é controlada pela coleção `users`.
- A criação de usuário pelo painel cria a conta no Firebase Authentication usando um app secundário no client.


## v5.1
- cálculo proporcional por minuto corrigido
- layout de impressão 80mm com fontes menores
