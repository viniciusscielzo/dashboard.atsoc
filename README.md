# ATSOC Control

Sistema executivo da ATSOC para gestão financeira, contratos, precificação e capacidade operacional.

## Executar localmente

Requisitos: Node.js 22 ou superior.

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000` e entre com o acesso definido na entrega.

## Publicar na Vercel

1. Extraia este ZIP e envie os arquivos para um repositório GitHub privado.
2. Na Vercel, clique em **Add New > Project** e importe o repositório.
3. Mantenha o framework como **Next.js**.
4. Não é necessário configurar variáveis de ambiente para o modo local.
5. Faça o deploy. O comando já está configurado como `npm run build:vercel`.

## Login e persistência

- O e-mail inicial é `vinicius@atsoc.com.br`.
- A senha não fica gravada em texto puro: somente seu verificador criptográfico existe no servidor.
- A sessão usa cookie `HttpOnly`, `SameSite=Strict` e `Secure` em produção.
- Todas as rotas do sistema são protegidas; somente login e verificação de saúde são públicas.
- Dados financeiros, clientes, contratos, equipe, cotações, cenários e parâmetros ficam no armazenamento local do navegador.
- Os dados permanecem disponíveis no mesmo navegador e domínio da Vercel.

Não limpe os dados do site no navegador. Trocar o domínio, usar outro navegador ou apagar o armazenamento do site não transfere automaticamente os registros.

## Estrutura futura

Os arquivos preparatórios do Supabase foram mantidos no projeto para uma migração posterior. Eles não são necessários para esta versão local e não devem ser configurados até a migração ser planejada.

## Verificação

```bash
npm run build
npm test
```
