# Instalação Local de Node.js, npm e AWS CLI

[English version](local-development-setup.md)

Este tutorial prepara a máquina local para build, testes, synth e deploy deste skeleton de site estático com AWS CDK.

## O Que Você Precisa

- Node.js 22 ou superior.
- npm, que vem junto nas instalações padrão do Node.js.
- AWS CLI v2.
- Credenciais AWS com permissões para CDK bootstrap/deploy, CloudFormation, S3, CloudFront, ACM e IAM.
- Um terminal: Terminal no macOS/Linux, PowerShell ou Windows Terminal no Windows.

## 1. Verifique Ferramentas Existentes

Rode:

```bash
node -v
npm -v
aws --version
```

Este projeto espera Node.js 22 ou superior. Se `node` ou `npm` não existir ou estiver antigo, instale Node.js. Se `aws` não existir, instale AWS CLI v2.

## 2. Instale Node.js e npm

A documentação do npm recomenda instalar Node.js e npm por meio de um gerenciador de versões quando possível. Um gerenciador facilita upgrades e versões específicas por projeto.

### Opção A: Gerenciador de Versão do Node

Use um gerenciador de versão compatível com seu sistema operacional e instale Node.js 22 LTS ou superior.

Opções comuns:

- macOS/Linux: `nvm` ou outro gerenciador de versão do Node.
- Windows: um gerenciador compatível com Windows, ou o instalador oficial do Node.js se você preferir um caminho mais simples.

Depois da instalação, verifique:

```bash
node -v
npm -v
```

### Opção B: Instalador Oficial do Node.js

Se preferir não usar gerenciador de versão:

1. Abra a página oficial de download do Node.js.
2. Baixe o instalador LTS para seu sistema operacional.
3. Rode o instalador e inclua npm quando solicitado.
4. Reinicie o terminal.
5. Verifique:

```bash
node -v
npm -v
```

## 3. Instale as Dependências do Projeto

Na raiz do repositório:

```bash
npm install
```

Para uma instalação limpa no estilo CI:

```bash
npm ci
```

Use `npm ci` apenas quando `package-lock.json` existir e você quiser uma instalação que corresponda exatamente ao lockfile.

## 4. Instale AWS CLI v2

Instale AWS CLI v2 usando as instruções oficiais da AWS para seu sistema operacional.

### macOS

Use o instalador oficial para macOS da AWS, ou instale com Homebrew se essa for sua ferramenta local padrão. Depois da instalação:

```bash
aws --version
```

### Linux

A AWS fornece um instalador zip para Linux. Siga as instruções oficiais do AWS CLI v2 para sua arquitetura de CPU e depois verifique:

```bash
aws --version
```

### Windows

A AWS fornece um instalador MSI para Windows. Instale, abra uma nova sessão do PowerShell ou Windows Terminal e verifique:

```powershell
aws --version
```

## 5. Configure Credenciais AWS

Para uma configuração local simples, rode:

```bash
aws configure
```

Você será solicitado a informar:

- AWS Access Key ID.
- AWS Secret Access Key.
- Região padrão, por exemplo `eu-west-1`.
- Formato padrão de saída, normalmente `json`.

A AWS salva esses valores nos arquivos compartilhados de configuração e credenciais dentro do diretório home. Não commite credenciais neste repositório.

Se sua organização usa AWS IAM Identity Center, SSO ou credenciais temporárias, configure o AWS CLI conforme o processo padrão da organização em vez de usar access keys long-lived.

## 6. Verifique o Acesso AWS

Rode:

```bash
aws sts get-caller-identity
```

Você deve ver a conta AWS e a identidade que executarão comandos CDK locais.

## 7. Prepare Este Projeto

Crie o arquivo local de ambiente:

```bash
cp .env.example .env
```

Edite `.env` com seus valores de conta, região, domínio e repositório GitHub.

Depois rode:

```bash
npm run build
npm run build:site
npm test
npm run synth
```

Se esses comandos passarem, o tooling local está pronto para CDK bootstrap e deploy.

## 8. CDK Bootstrap

Faça bootstrap da região do certificado e da região da stack principal:

```bash
npx cdk bootstrap aws://123456789012/us-east-1
npx cdk bootstrap aws://123456789012/eu-west-1
```

Troque a conta e as regiões pelos valores do seu `.env`. `us-east-1` é necessário para o certificado ACM usado pelo CloudFront.

## Troubleshooting

- `node: command not found`: instale Node.js e reinicie o terminal.
- `npm: command not found`: reinstale Node.js com npm incluído, ou confira o `PATH` do shell.
- `aws: command not found`: instale AWS CLI v2 e reinicie o terminal.
- `Unable to locate credentials`: rode `aws configure`, configure SSO ou exporte credenciais temporárias usando o processo da sua organização.
- CDK deploy usa a conta errada: rode `aws sts get-caller-identity` e confira `AWS_ACCOUNT_ID` no `.env`.
- Erros de permissão durante CDK deploy: confirme que a identidade AWS tem permissões para CloudFormation, S3, CloudFront, ACM, IAM e recursos de CDK bootstrap.

## Referências Oficiais

- Guia npm para instalar Node.js e npm: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm/
- Downloads do Node.js: https://nodejs.org/en/download
- Guia de instalação do AWS CLI v2: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
- Comando `aws configure`: https://docs.aws.amazon.com/cli/latest/reference/configure/
- Arquivos de configuração do AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
