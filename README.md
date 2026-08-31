# ATSOC Control

Sistema executivo da ATSOC para gestão financeira, contratos, precificação e capacidade operacional.

## Executar localmente

Requisitos: Node.js 22 ou superior.

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Publicar na Vercel com Supabase

1. Extraia este ZIP e envie os arquivos para um repositório GitHub.
2. Crie um projeto no Supabase e execute, nesta ordem, os arquivos `supabase/migrations/0001_atsoc_core.sql` e `0002_auth_workspace.sql` no SQL Editor.
3. Em **Authentication > Users**, crie o primeiro usuário administrador.
4. Copie o UUID desse usuário, substitua `YOUR_AUTH_USER_UUID` em `supabase/seed_admin.sql` e execute o arquivo uma única vez.
5. Em **Authentication > Providers > Email**, mantenha login por e-mail ativo e desative cadastro público.
6. Na Vercel, clique em **Add New > Project**, importe o repositório e mantenha o framework como **Next.js**.
7. Cadastre `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em **Settings > Environment Variables** para Production, Preview e Development.
8. No Supabase, configure **Site URL** com o domínio da Vercel e inclua `https://SEU-DOMINIO/auth/callback` em **Redirect URLs**.
9. Faça o deploy. O comando de build já está configurado como `npm run build:vercel`.

Não é necessário cadastrar `SUPABASE_SERVICE_ROLE_KEY` na Vercel para o funcionamento atual.

## Dados iniciais incluídos

- custos fixos atuais: R$ 5.683/mês;
- Vinicius, Carlos e Gabriel com meta gerencial de R$ 5.500 cada;
- pró-labore atual do Carlos de R$ 800;
- colaborador comercial PJ de R$ 1.800, sem consumo de capacidade operacional;
- Grupo Silva por R$ 1.000/mês, com validade definida;
- contrato LIKE LINK TELECOM com base, MRR, vencimento e cobertura editáveis.

Todos os dados podem ser editados ou excluídos pela interface.

## Login e persistência

Esta versão já possui:

- login por e-mail e senha com sessão segura do Supabase;
- recuperação de senha;
- proteção de todas as rotas do sistema;
- vínculo obrigatório do usuário à organização ATSOC;
- dados oficiais persistidos no Supabase, com RLS por organização;
- trilha de auditoria das alterações do estado de trabalho;
- logout seguro e tela de erro para evitar telas pretas.

O `localStorage` é usado apenas para a preferência visual claro/escuro. Dados financeiros, clientes, contratos, equipe, cotações, cenários e parâmetros são salvos no banco.

As variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` são públicas por definição. Elas não concedem acesso aos dados sem uma sessão autenticada e as políticas RLS. Nunca exponha a chave `service_role`.

### Primeiro acesso

Após o seed do administrador, abra a URL da Vercel e entre com o e-mail e a senha criados no Supabase. No primeiro acesso, o sistema grava automaticamente o conjunto inicial já cadastrado neste projeto.

### Outros usuários

Crie o usuário em **Authentication > Users** e use o modelo `supabase/add_user.sql` para vinculá-lo à organização. A versão atual libera o workspace completo somente para `owner`, `admin` e `partner`, evitando que custos internos sejam expostos a vendedores antes da separação de permissões por módulo.

## Verificação

```bash
npm run build
npm test
```
