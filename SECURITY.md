# Segurança e implantação do ATSOC Control

## Princípios obrigatórios

- O navegador nunca recebe `SUPABASE_SERVICE_ROLE_KEY` ou `ATSOC_ENCRYPTION_KEY`.
- Toda leitura e escrita de dados oficiais deve passar por autenticação e pelas políticas RLS do Supabase.
- A aplicação deve usar o JWT do usuário nas chamadas ao Supabase; a chave `service_role` fica restrita a migrações e rotinas administrativas isoladas.
- O estado oficial fica em `workspace_states`, protegido por organização. A logo atual é armazenada dentro desse estado; o bucket privado já está preparado para uma futura migração de arquivos.
- Logs não podem registrar tokens, documentos, dados financeiros completos ou corpos de requisições.
- Alterações financeiras, contratuais, de parâmetros e permissões devem gerar trilha de auditoria.

## Vercel

1. Conectar o repositório e manter o framework como Next.js.
2. Cadastrar as variáveis de `.env.example` somente no painel da Vercel.
3. `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` são configurações públicas do SDK; nunca usar esse prefixo em `service_role` ou segredos internos.
4. Executar as migrações do diretório `supabase/migrations` antes de liberar usuários.
5. Configurar domínio HTTPS, proteção de acesso e autenticação Supabase.

## Supabase

- Ativar autenticação com MFA para administradores e sócios.
- Desabilitar cadastro público se os usuários forem convidados internamente.
- Revisar as políticas RLS após qualquer nova tabela.
- Manter backups, Point-in-Time Recovery quando disponível e alertas de acesso.
- Rotacionar chaves imediatamente em caso de suspeita de exposição.

## Estado atual

- Login, renovação de sessão e recuperação de senha usam Supabase Auth.
- A rota `/api/workspace` valida a sessão no servidor e não aceita organização enviada pelo navegador.
- O banco determina a organização pelo vínculo do usuário autenticado.
- Apenas `owner`, `admin` e `partner` podem ler ou alterar o workspace completo.
- O navegador não armazena os dados oficiais em `localStorage`.
- A função de atualização aceita somente recursos explicitamente autorizados e gera revisão e auditoria.

## Checklist antes de produção

- Desabilitar cadastro público e confirmar os Redirect URLs.
- Ativar MFA para sócios e administradores.
- Testar RLS com um usuário sem vínculo e com um usuário de outra organização.
- Habilitar backups e, se disponível no plano, Point-in-Time Recovery.
- Não enviar `.env.local`, dumps ou chaves para o Git.
- Conceder os papéis `seller`, `finance` e `collaborator` somente quando as telas específicas desses perfis estiverem liberadas.
