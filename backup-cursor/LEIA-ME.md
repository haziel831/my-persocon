# Backup das conversas do Cursor — Desktop Pets

## O que tem aqui
- `CONTEXTO.md`: resumo do projeto e de onde o trabalho parou. **Comece por este.**
- `PROMPTS.md`: todos os pedidos feitos ao agente, completos e em ordem.
- `conversas/*.md`: as conversas legíveis (seus pedidos + respostas do agente).
- `conversas/*.jsonl`: as conversas originais, no formato bruto do Cursor.

## Como usar em outra conta do Cursor
O Cursor não tem botão de "importar conversa". O jeito é dar estes arquivos como contexto ao agente:

1. Copie a pasta inteira do projeto (`Desktop Pets`, incluindo `backup-cursor` e `.cursor/rules`) para o outro computador/conta, ou abra a mesma pasta.
2. Abra a pasta no Cursor da outra conta.
3. No primeiro chat, mande:

> Leia `backup-cursor/CONTEXTO.md` e `backup-cursor/PROMPTS.md`. Esse é o histórico do projeto vindo de outra conta. Continue a partir de onde parou. Se precisar de detalhes, consulte `backup-cursor/conversas/3082df77-1a20-426a-b3f9-7c59796676c4.md`.

A regra de responder em português (`.cursor/rules/idioma.mdc`) já vai junto com a pasta do projeto.

## Atualizar o backup
Na pasta do projeto, rode: `node scripts/backup-chats.mjs`
