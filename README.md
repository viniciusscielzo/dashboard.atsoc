# ATSOC Control

Sistema executivo da ATSOC para gestão financeira, contratos, precificação e capacidade operacional.

## Executar localmente

Requisitos: Node.js 22 ou superior.

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Publicar na Vercel

1. Extraia este ZIP e envie os arquivos para um repositório GitHub.
2. Na Vercel, clique em **Add New > Project** e importe o repositório.
3. Mantenha o framework como **Next.js**.
4. O comando de build já está configurado como `npm run build:vercel`.
5. Clique em **Deploy**.

## Dados iniciais incluídos

- custos fixos atuais: R$ 5.683/mês;
- Vinicius, Carlos e Gabriel com meta gerencial de R$ 5.500 cada;
- pró-labore atual do Carlos de R$ 800;
- colaborador comercial PJ de R$ 1.800, sem consumo de capacidade operacional;
- Grupo Silva por R$ 1.000/mês, com validade definida;
- contrato LIKE LINK TELECOM com base, MRR, vencimento e cobertura editáveis.

Todos os dados podem ser editados ou excluídos pela interface.

## Supabase

O front-end funciona inicialmente com armazenamento local. A estrutura segura para Supabase está em:

- `supabase/migrations/0001_atsoc_core.sql`;
- `lib/server/supabase-rest.ts`;
- `.env.example`;
- `SECURITY.md`.

Antes de usar dados financeiros reais compartilhados entre usuários, conecte o Supabase, ative autenticação e aplique as políticas RLS descritas na migração.

Nunca coloque `SUPABASE_SERVICE_ROLE_KEY` ou `ATSOC_ENCRYPTION_KEY` em variáveis com prefixo `NEXT_PUBLIC_`.

## Verificação

```bash
npm run build
npm test
```
