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

## CRM Comercial

O menu **CRM Comercial** possui:

- indicadores para hoje, 7, 15, 30 e 90 dias;
- pipeline de Prospecção até Negociação;
- origem e etapa selecionáveis;
- responsável automático Vinicius Scielzo;
- botão para avançar o lead;
- envio dos dados básicos diretamente ao Cotador;
- conversão da negociação em cliente e recebimentos mensais;
- registro de oportunidades perdidas com motivo;
- históricos separados de ganhos e perdas.

Ao converter um lead, complete os horários contratados em **Clientes e Contratos** para que o FTE e a capacidade sejam calculados corretamente.

## Estrutura futura

Os arquivos preparatórios do Supabase foram mantidos no projeto para uma migração posterior. Eles não são necessários para esta versão local e não devem ser configurados até a migração ser planejada.

## Verificação

```bash
npm run build
npm test
```
- As etapas mudam somente pelo botão **Avançar** ou arrastando o card entre as colunas.
- **Cotar** mantém o lead na etapa atual e vincula o valor salvo ao card do CRM.
- O histórico de cotações permite exclusão individual.
- Leads enviados ao follow-up podem voltar ao início da prospecção; nenhum lead precisa ser descartado.

## Precificação por faixa horária

- A carga operacional é calculada em blocos de 30 minutos.
- Os fatores iniciais são: diurno 1,00; noturno 0,80; madrugada 0,50.
- Os fatores ajustam FTE, capacidade simultânea, horas equivalentes e custo operacional.
- As faixas são editáveis em **Configurações > Parâmetros operacionais**.
- Dados já salvos recebem somente os novos parâmetros; leads, cotações, clientes e contas permanecem preservados.
- A referência comercial histórica continua separada do piso financeiro para permitir comparação gerencial.

As ações **Salvar** e **Gerar proposta** executam diretamente sua função e exibem apenas uma confirmação temporária, sem abrir formulários intermediários.
