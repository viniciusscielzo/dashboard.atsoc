# Segurança do ATSOC Control — modo local

## Proteções implementadas

- Login validado exclusivamente no servidor.
- Senha armazenada somente como hash derivado com `scrypt` e salt aleatório.
- Comparação resistente a ataques de temporização.
- Sessão assinada com validade de sete dias.
- Cookie de sessão `HttpOnly`, `SameSite=Strict` e `Secure` em produção.
- Rotas privadas bloqueadas pelo proxy antes de abrir o sistema.
- Mensagem de login genérica para não revelar qual campo está incorreto.
- Cabeçalhos de segurança configurados no Next.js.

## Limites do modo local

- Os registros ficam no navegador, não em um banco central.
- Apagar os dados do site apaga os registros locais.
- Outro navegador, computador ou domínio não recebe automaticamente os dados.
- Este modo é adequado para uso pessoal em um dispositivo confiável, mas não substitui autenticação centralizada, MFA, RLS e backups para múltiplos usuários.

## Cuidados para publicação

- Use um repositório GitHub privado.
- Não compartilhe o ZIP ou o código-fonte publicamente.
- Publique exclusivamente com HTTPS pela Vercel.
- Restrinja o acesso físico e o perfil do Windows utilizado para operar o sistema.
- Não salve senhas no navegador de computadores compartilhados.
- Para incluir outros usuários, migre autenticação e persistência para Supabase antes de liberar os acessos.

## Migração futura para Supabase

Os arquivos de migração foram preservados, mas estão inativos nesta versão. Antes da migração, configure Supabase Auth, RLS por organização, backups e perfis de acesso. Nunca exponha a chave `service_role` no navegador ou no repositório.
