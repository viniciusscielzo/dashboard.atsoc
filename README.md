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
- pipeline de Prospecção até Negociação, com criação de colunas personalizadas;
- tags manuais e alertas automáticos de ação atrasada, ação de hoje e cotação vinculada;
- agenda em cards separados por atrasadas, hoje, futuras e sem data; ao clicar,
  o sistema abre e destaca o lead diretamente no Pipeline ou no Follow-up;
- origem e etapa selecionáveis;
- responsável automático Vinicius Scielzo;
- botão para avançar o lead;
- envio dos dados básicos diretamente ao Cotador;
- conversão da negociação em cliente e recebimentos mensais;
- registro de oportunidades perdidas com motivo;
- históricos separados de ganhos e perdas.

A atualização do CRM é compatível com registros anteriores. O sistema mantém os
leads já existentes e acrescenta apenas os novos campos opcionais de tags e
configuração das colunas.

Ao criar uma coluna, ela é adicionada ao fim do pipeline e o quadro rola
automaticamente até ela. Todas as colunas permitem editar nome e cor. A alça
do cabeçalho permite reorganizar a coluna inteira, mantendo todos os leads
vinculados a ela. Com mais de cinco colunas, o pipeline permanece em uma única
linha e apresenta navegação horizontal, sem enviar etapas para baixo do quadro.

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

## Equipe, escalas e ocorrências

- Em **Equipe > Editar pessoa**, escolha uma escala por ciclo ou dias da semana personalizados.
- Na escala semanal, cada dia possui marcação de trabalho/folga e horários próprios de entrada e saída.
- Em **Ajustes e ocorrências por data**, registre folga, falta, afastamento/atestado, férias ou trabalho extraordinário.
- Toda ocorrência exige um motivo; faltas e afastamentos registram se o atestado foi entregue, e trabalhos ajustados podem ser marcados como extra.
- A ocorrência do dia prevalece sobre a escala habitual e atualiza automaticamente os cards de Equipe e a disponibilidade em Operação e Capacidade.
- Colaboradores já cadastrados e suas ocorrências permanecem intactos; apenas a antiga escala genérica dos três sócios é migrada para os horários informados.
- O botão **Aplicar escala dos sócios** configura a cobertura atual da ATSOC: Gabriel de 08h às 11h45, Vinicius de 11h45 às 18h30 e Carlos de 18h30 às 00h nos dias úteis; Carlos cobre sábado de 09h às 14h30.
- Vinicius e Gabriel possuem revezamento quinzenal: um cobre sábado de 14h30 às 20h e o outro domingo de 09h às 15h; na semana seguinte, as posições são invertidas automaticamente.
- A data inicial e quem começa no sábado podem ser alterados no cadastro, sem perder ocorrências anteriores.
