# ES³ — Sistema de Gestão de Obras

Este repositório é a base do sistema de gestão de obras da ES³ Engenharia de Obras. O módulo pronto até
agora é o de **Propostas e Orçamentos Automáticos**.

## Módulos

### 1. Propostas de Serviço (módulo principal)

Reproduz digitalmente o modelo de proposta comercial da ES³ (escopo por etapas, investimento fechado,
condições de pagamento parceladas, observações e diferenciais), mas com cálculo automático:

- Você cadastra uma vez, no **Catálogo de Escopo**, cada serviço que a empresa executa: categoria (ex:
  "Fundações"), nome, texto de escopo (o mesmo texto que vai para o PDF) e **custo base**.
- Ao montar uma proposta, você **marca os itens de escopo** usados no projeto e informa a **quantidade**
  de cada um (levantamento de quantitativos). O sistema calcula o custo total automaticamente.
- Você informa o seu **markup** (%) e o sistema sugere o valor de venda (custo + markup). Esse valor
  final pode ser ajustado manualmente antes de fechar a proposta.
- Você monta as **condições de pagamento** (parcelas por % ou valor fixo) — os valores são calculados
  sozinhos a partir do valor final.
- Ao salvar, o sistema gera automaticamente o **PDF da proposta**, com cabeçalho e logo da ES³, escopo
  organizado por categoria, caixa de investimento (com valor por extenso), condições de pagamento,
  observações gerais, diferenciais da empresa e assinatura do responsável técnico.

### 2. Assistente IA (montar proposta conversando)

Em vez de preencher a lista de escopo manualmente, clique em **"✨ Montar com Assistente IA"** na aba
Propostas. A IA (Claude, da Anthropic) vai fazendo perguntas — dados do cliente, o que a obra tem de cada
categoria do catálogo, quantidades, markup, condições de pagamento — e você só vai respondendo em texto
normal. No final, ela te leva para a mesma tela de proposta já preenchida, para você **revisar e ajustar**
antes de gerar o PDF (nada é salvo automaticamente sem sua conferência).

Isso precisa de uma chave de API da Anthropic configurada — veja a seção **"Configurar o Assistente IA"**
abaixo. Sem a chave, o resto do sistema funciona normalmente; só o botão do assistente mostra um aviso.

### 3. Catálogo de Escopo

Cadastro reutilizável dos serviços/etapas construtivas da empresa (o "banco de dados" de escopo e preço
base usado pelas propostas). Use `{{qtd}}` no texto do escopo onde quiser que a quantidade apareça
automaticamente no PDF (ex: `"Execução de piso polido — {{qtd}}, equipe própria."` vira
`"Execução de piso polido — 700 m², equipe própria."`).

### 4. Orçamentos Rápidos

Um segundo módulo mais simples, para orçamentos pequenos com lista de item × quantidade × preço (sem toda
a estrutura de uma proposta completa). Útil para serviços avulsos.

### 5. Clientes, Serviços e Minha Empresa

Cadastros de apoio usados pelos dois módulos acima. Em **"Minha Empresa"** ficam os dados que aparecem em
todo PDF: nome, CNPJ, endereço, slogan, texto "sobre a empresa", diferenciais, frase de rodapé, markup
padrão, forma de pagamento padrão, numeração das propostas e responsável técnico padrão.

## Como rodar (passo a passo)

Você vai precisar do **Node.js** instalado no computador (baixe em https://nodejs.org, versão "LTS"). Depois disso:

1. Abra um terminal na pasta do projeto.
2. Instale as dependências (só precisa fazer isso uma vez):
   ```
   npm install
   ```
3. Inicie o sistema:
   ```
   npm start
   ```
4. Abra o navegador em: **http://localhost:3000**

Os dados ficam salvos em um arquivo (`data/es3.db`) na própria pasta do projeto — continuam lá mesmo depois
de fechar e abrir o sistema de novo.

## Configurar o Assistente IA (opcional, mas recomendado)

O assistente usa a API da Anthropic (a empresa por trás do Claude — a mesma IA usada para construir este
sistema). O uso é cobrado por token, mas é bem barato: cada conversa completa para montar uma proposta
custa tipicamente poucos centavos de dólar.

**Passo a passo para criar sua conta e chave:**

1. Acesse **https://console.anthropic.com** e crie uma conta (ou entre, se já tiver uma).
2. No menu, vá em **"API Keys"** e clique em **"Create Key"**. Dê um nome (ex: "ES3 Sistema") e copie a
   chave gerada — ela começa com `sk-ant-...` e só é exibida uma vez, então copie antes de fechar a tela.
3. Vá em **"Billing"** e adicione um método de pagamento e um valor de crédito (ex: US$ 5 já dá para
   centenas de propostas). Sem isso, a chave funciona mas as chamadas são recusadas por falta de crédito.
4. Na pasta do projeto, copie o arquivo `.env.example` para um novo arquivo chamado `.env`:
   ```
   cp .env.example .env
   ```
5. Abra o `.env` em um editor de texto e cole sua chave depois do `=`, sem espaços e sem aspas:
   ```
   ANTHROPIC_API_KEY=sk-ant-sua-chave-aqui
   ```
6. Salve o arquivo e reinicie o sistema (`npm start`). O botão "✨ Montar com Assistente IA" já vai funcionar.

**Importante:** o arquivo `.env` nunca é enviado ao GitHub (está no `.gitignore` de propósito) — é assim
que sua chave fica só no seu computador/servidor, e não fica pública no código.

## Primeiro uso

1. Vá na aba **"Minha Empresa"** e confira/ajuste os dados (já vêm pré-preenchidos com as informações da
   ES³ Engenharia de Obras extraídas do seu modelo). Ajuste principalmente o **markup padrão** e o
   **próximo número de proposta** (para continuar a numeração que você já usa).
2. Vá na aba **"Catálogo de Escopo"** e cadastre os serviços/etapas que a empresa executa, com o texto de
   escopo e o custo base de cada um. Você pode ir cadastrando aos poucos, conforme for montando propostas.
3. Vá na aba **"Clientes"** e cadastre o cliente do projeto (ou cadastre na hora, se preferir).
4. Vá na aba **"Propostas" → "+ Nova Proposta"**: preencha os dados gerais, marque os itens de escopo
   usados no projeto com as quantidades, confira o valor calculado com o markup, ajuste as condições de
   pagamento e as observações, e clique em **"Salvar e Gerar PDF"**. O PDF abre automaticamente.

## Estrutura do projeto (para referência futura)

```
server/
  index.js            -> ponto de entrada do servidor
  db.js               -> banco de dados (SQLite) e suas tabelas
  routes/             -> regras de cada recurso (propostas, catálogo, clientes, serviços, orçamentos, empresa, assistente)
  pdf/                -> geração dos PDFs (proposta e orçamento rápido)
  utils/              -> valor por extenso, formatação de moeda/data
  assets/             -> logo e marca d'água da ES³ usados no PDF da proposta
public/
  index.html          -> telas do sistema
  css/style.css       -> visual
  js/app.js           -> comportamento das telas (chama a API e calcula os totais)
data/
  es3.db              -> banco de dados (criado automaticamente, não é versionado no Git)
.env                  -> sua chave da Anthropic (você cria a partir do .env.example; não é versionado no Git)
```

Essa estrutura foi pensada para crescer: cada novo módulo do sistema (ex: controle de obras, funcionários,
materiais, financeiro) pode ganhar suas próprias rotas em `server/routes/`, suas tabelas em `server/db.js`
e suas telas em `public/`, sem precisar mexer no que já existe.

## Próximos passos possíveis

- Login/usuários (hoje o sistema é de uso único, sem senha).
- Envio da proposta por e-mail/WhatsApp direto pelo sistema.
- Histórico de revisões de uma mesma proposta (B, C...) com comparação de valores.
- Upload de um logo próprio (hoje usa o logo/marca d'água extraídos do seu modelo em PDF).
- Módulo de controle de obras, materiais e funcionários, reaproveitando clientes e escopo já cadastrados aqui.

Se quiser evoluir para algo acessível pela internet (não só no seu computador), dá para hospedar esse mesmo
projeto em serviços como Railway ou Render — é só avisar quando quiser fazer isso.
