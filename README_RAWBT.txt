Ajuste implementado para impressao Android / RAWBT

O que mudou:
- Nova configuracao em Configuracoes > Metodo de Impressao:
  - Navegador Padrao
  - Android / RAWBT
- No modo RAWBT em Android, o sistema nao dispara impressao automatica em popup.
- O cupom abre em uma tela simplificada com botoes:
  - Imprimir
  - Compartilhar (quando suportado pelo navegador)
- Desktop continua usando o fluxo atual de popup com impressao automatica.

Como usar no celular:
1. Abra Configuracoes.
2. Selecione Metodo de Impressao = Android / RAWBT.
3. Salve.
4. Ao gerar ticket/comprovante, toque em Imprimir na tela do cupom.
5. Se desejar, use Compartilhar e selecione o RAWBT.

Arquivos alterados:
- app/configuracoes/page.tsx
- app/print/entrada/[id]/page.tsx
- app/print/saida/[id]/page.tsx
- app/print/caixa/[id]/page.tsx
- lib/print.ts
- lib/settings.ts
- types/index.ts
