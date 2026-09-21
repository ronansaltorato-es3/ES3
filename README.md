# ES3 — Sistema de Gestão de Obras

Este repositório é a base do seu sistema de gestão de obras. O primeiro módulo pronto é o de **Orçamento Automático**.

## O que esse módulo faz

- Você cadastra seus **serviços** (ex: "Alvenaria de vedação", unidade m², preço R$ 85,50) uma única vez.
- Você cadastra seus **clientes**.
- Você monta um **orçamento** escolhendo cliente + itens (do catálogo ou digitados na hora). O sistema calcula subtotal, desconto e total automaticamente, na tela, enquanto você digita.
- Ao salvar, o sistema gera e abre um **PDF profissional do orçamento** automaticamente, com o cabeçalho da sua empresa, dados do cliente, tabela de itens e totais.
- Todos os orçamentos ficam salvos e podem ser reabertos, editados ou baixados novamente em PDF a qualquer momento.

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

Pronto — a tela do sistema vai abrir. Os dados ficam salvos em um arquivo (`data/es3.db`) na própria pasta do projeto, então eles continuam lá mesmo depois de fechar e abrir o sistema de novo.

## Primeiro uso

1. Vá na aba **"Minha Empresa"** e preencha o nome, telefone, endereço etc. Isso aparece no cabeçalho de todo PDF gerado.
2. Vá na aba **"Serviços"** e cadastre os serviços que você mais usa, com o preço padrão de cada um (você pode ajustar o preço na hora de montar um orçamento específico, se precisar).
3. Vá na aba **"Clientes"** e cadastre o cliente para quem você vai fazer o orçamento (ou cadastre na hora, se preferir).
4. Vá na aba **"Orçamentos" → "+ Novo Orçamento"**, escolha o cliente, adicione os itens (escolhendo do catálogo ou digitando um item avulso), ajuste desconto se quiser, e clique em **"Salvar Orçamento"**. O PDF abre automaticamente em uma nova aba do navegador.

## Estrutura do projeto (para referência futura)

```
server/
  index.js          -> ponto de entrada do servidor
  db.js             -> banco de dados (SQLite) e suas tabelas
  routes/           -> regras de cada recurso (clientes, serviços, orçamentos, empresa)
  pdf/               -> geração do PDF do orçamento
public/
  index.html         -> telas do sistema
  css/style.css       -> visual
  js/app.js           -> comportamento das telas (chama a API e calcula os totais)
data/
  es3.db              -> banco de dados (criado automaticamente, não é versionado no Git)
```

Essa estrutura foi pensada para crescer: cada novo módulo do sistema (ex: controle de obras, funcionários, materiais, financeiro) pode ganhar suas próprias rotas em `server/routes/`, suas tabelas em `server/db.js` e suas telas em `public/`, sem precisar mexer no que já existe.

## Próximos passos possíveis

- Login/usuários (hoje o sistema é de uso único, sem senha).
- Envio do orçamento por e-mail direto pelo sistema.
- Status do orçamento (aprovado/reprovado) com acompanhamento.
- Módulo de controle de obras, materiais e funcionários, reaproveitando clientes e serviços já cadastrados aqui.

Se quiser evoluir para algo acessível pela internet (não só no seu computador), dá para hospedar esse mesmo projeto em serviços como Railway ou Render — é só avisar quando quiser fazer isso.
