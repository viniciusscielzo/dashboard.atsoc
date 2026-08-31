# Segurança e implantação do ATSOC Control

## Princípios obrigatórios

- O navegador nunca recebe `SUPABASE_SERVICE_ROLE_KEY` ou `ATSOC_ENCRYPTION_KEY`.
- Toda leitura e escrita de dados oficiais deve passar por autenticação e pelas políticas RLS do Supabase.
- A aplicação deve usar o JWT do usuário nas chamadas ao Supabase; a chave `service_role` fica restrita a migrações e rotinas administrativas isoladas.
- O bucket de logos é privado. A interface deve usar upload autenticado e URLs assinadas com expiração curta.
- Logs não podem registrar tokens, documentos, dados financeiros completos ou corpos de requisições.
- Alterações financeiras, contratuais, de parâmetros e permissões devem gerar trilha de auditoria.

## Vercel

1. Conectar o repositório e manter o framework como Next.js.
2. Cadastrar as variáveis de `.env.example` somente no painel da Vercel.
3. Nunca copiar valores reais para arquivos versionados ou variáveis `NEXT_PUBLIC_*`.
4. Executar as migrações do diretório `supabase/migrations` antes de liberar usuários.
5. Configurar domínio HTTPS, proteção de acesso e autenticação Supabase.

## Supabase

- Ativar autenticação com MFA para administradores e sócios.
- Desabilitar cadastro público se os usuários forem convidados internamente.
- Revisar as políticas RLS após qualquer nova tabela.
- Manter backups, Point-in-Time Recovery quando disponível e alertas de acesso.
- Rotacionar chaves imediatamente em caso de suspeita de exposição.

## Estado atual

O front-end ainda utiliza armazenamento local apenas para os dados de validação visual. A camada `lib/server` e o esquema Supabase estabelecem a fronteira segura para substituir esse armazenamento por APIs autenticadas. Dados oficiais não devem ser inseridos em produção antes dessa troca e da ativação do login.
