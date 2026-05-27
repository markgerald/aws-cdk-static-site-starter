# AWS CDK Static Site Starter

[![CI](https://github.com/markgerald/aws-cdk-static-site-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/markgerald/aws-cdk-static-site-starter/actions/workflows/ci.yml)

[English version](../README.md)

Starter reutilizável de AWS CDK para site estático com S3 privado, CloudFront OAC, ACM, Cloudflare DNS e deploys via GitHub Actions.

## Documentação

- [Instalação local de Node.js, npm e AWS CLI](local-development-setup.pt-BR.md)
- [Tutorial de domínio, DNS e SSL/TLS na Cloudflare](cloudflare-domain-dns-ssl.pt-BR.md)
- [Versão em inglês do tutorial de setup local](local-development-setup.md)
- [Versão em inglês do tutorial Cloudflare](cloudflare-domain-dns-ssl.md)

## Arquitetura

```text
Usuário
  -> Cloudflare DNS, preferencialmente DNS only no início
  -> CloudFront Distribution com HTTPS e redirect HTTP -> HTTPS
  -> Origin Access Control com assinatura SigV4
  -> Bucket S3 privado com Block Public Access

GitHub Actions
  -> OIDC para IAM Role na AWS
  -> npm run build:site
  -> cdk deploy
  -> aws s3 sync website_dist/
  -> cloudfront create-invalidation

ACM us-east-1
  <- CNAMEs de validação criados manualmente na Cloudflare
```

O projeto não usa Route 53, WAF, Lambda@Edge, CloudFront Functions nem logs do CloudFront. Esses recursos podem ser úteis em ambientes maiores, mas não são necessários para um site React pequeno servido como arquivos estáticos.

Como o exemplo mantém a stack principal em `eu-west-1` e o certificado em `us-east-1`, o CDK cria recursos auxiliares de referência cross-region. Para evitar isso, você pode executar a stack principal também em `us-east-1` ou adaptar o projeto para importar um `certificateArn` já validado.

## Pré-requisitos

- Conta AWS com permissões para CDK, CloudFormation, S3, CloudFront, ACM e IAM.
- Node.js 22 ou superior.
- AWS CLI configurado para deploy local.
- AWS CDK CLI instalado via dependência do projeto.
- Domínio já apontando para a Cloudflare como DNS autoritativo.
- Cloudflare com permissão para criar registros DNS.

## Configuração Inicial

Este repositório foi pensado como skeleton reutilizável. Copie o contrato de ambiente e ajuste os valores para o seu domínio, conta AWS e repositório:

```bash
cp .env.example .env
```

```dotenv
PROJECT_NAME=aws-cdk-static-site-starter
DOMAIN_NAME=example.com
WWW_DOMAIN_NAME=www.example.com

AWS_ACCOUNT_ID=123456789012
AWS_REGION=eu-west-1
CERTIFICATE_REGION=us-east-1

ENABLE_SPA_FALLBACK=true

CREATE_GITHUB_OIDC_ROLE=false
GITHUB_OWNER=my-github-user
GITHUB_REPO=aws-cdk-static-site-starter
GITHUB_BRANCH=main
GITHUB_OIDC_PROVIDER_ARN=
```

O arquivo `.env` é carregado automaticamente pelo CDK no deploy local e não deve ser commitado. Em produção, configure as mesmas chaves como GitHub Actions Repository Variables. O `cdk.json` fica limitado ao comando da app; os parâmetros do projeto vivem no ambiente.

O certificado deve ficar em `us-east-1`, porque CloudFront exige certificados ACM nessa região. O bucket S3 e a stack principal podem ficar em `eu-west-1` ou outra região.

## Instalar Dependências

```bash
npm install
```

Depois disso, o `package-lock.json` deve ser commitado para o GitHub Actions conseguir usar `npm ci`.

## Bootstrap do CDK

Faça bootstrap nas duas regiões, porque o certificado fica em `us-east-1` e a stack principal pode ficar em outra região:

```bash
npx cdk bootstrap aws://123456789012/us-east-1
npx cdk bootstrap aws://123456789012/eu-west-1
```

Troque `123456789012` e `eu-west-1` pelos seus valores.

## Deploy Local

```bash
npm run build
npm run build:site
npm test

npx cdk deploy --all \
  --require-approval never
```

Na primeira execução, a stack do certificado ACM ficará aguardando validação DNS. Abra o console do ACM em `us-east-1`, encontre o certificado para `example.com` e copie os registros CNAME de validação.

## Validar Certificado ACM na Cloudflare

No painel da Cloudflare:

1. Abra a zona do domínio.
2. Vá em **DNS**.
3. Crie os registros CNAME exibidos pelo ACM.
4. Deixe os registros de validação como **DNS only**.
5. Aguarde o ACM mudar o certificado para `Issued`.

Observação: a Cloudflare pode remover automaticamente o sufixo do domínio no campo `Name`. Isso é normal. Por exemplo, `_abc.example.com` pode aparecer como `_abc`.

## Configurar DNS na Cloudflare

Depois que o CDK criar a distribuição CloudFront, pegue o output `CloudFrontDomainName`, por exemplo:

```text
d111111abcdef8.cloudfront.net
```

Crie os registros:

```text
Type   Name   Target
CNAME  @      d111111abcdef8.cloudfront.net
CNAME  www    d111111abcdef8.cloudfront.net
```

Para o domínio raiz, a Cloudflare usa CNAME flattening. Comece com os registros em **DNS only** para evitar proxy duplo entre Cloudflare e CloudFront. Depois, se quiser ativar o proxy da Cloudflare, use TLS `Full (strict)` e teste cache, headers e redirects com cuidado.

Não crie variável `HOSTED_ZONE` e não configure Route 53. Este projeto não usa hosted zone na AWS.

## Publicar Arquivos do Site

Após o deploy da infraestrutura, envie o site:

```bash
npm run build:site

BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name aws-cdk-static-site-starter-static-site \
  --region eu-west-1 \
  --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucketName'].OutputValue" \
  --output text)

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name aws-cdk-static-site-starter-static-site \
  --region eu-west-1 \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
  --output text)

aws s3 sync website_dist/ "s3://${BUCKET_NAME}" --delete --cache-control "public,max-age=300"
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*"
```

O GitHub Actions faz estes comandos automaticamente em cada push na branch `main`.

## Testes

Este projeto inclui testes unitários de CDK com Jest, `ts-jest` e `aws-cdk-lib/assertions`.

```bash
npm test
npm run test:coverage
```

A suíte em `test/static-site-stack.test.ts` valida certificado ACM, bucket privado, CloudFront com OAC, bucket policy, aliases, HTTPS, cache otimizado, fallback SPA opcional e role OIDC opcional do GitHub Actions.

O workflow `.github/workflows/ci.yml` roda em pull requests e pushes para `main`, executando build, testes e `cdk synth` sem precisar de credenciais AWS. O workflow de deploy também executa os testes antes de aplicar infraestrutura.

## GitHub Actions com OIDC

O workflow está em `.github/workflows/deploy.yml`. Ele faz checkout, autenticação AWS via OIDC, instalação de dependências, build, testes, `cdk deploy`, leitura dos outputs, upload para S3 e invalidation no CloudFront.

Configure estas **Repository Variables** no GitHub:

```text
AWS_ACCOUNT_ID=123456789012
AWS_REGION=eu-west-1
AWS_ROLE_ARN=arn:aws:iam::123456789012:role/aws-cdk-static-site-starter-github-actions-deploy
DOMAIN_NAME=example.com
WWW_DOMAIN_NAME=www.example.com
PROJECT_NAME=aws-cdk-static-site-starter
CERTIFICATE_REGION=us-east-1
ENABLE_SPA_FALLBACK=true
CREATE_GITHUB_OIDC_ROLE=false
GITHUB_OWNER=my-github-user
GITHUB_REPO=aws-cdk-static-site-starter
GITHUB_BRANCH=main
GITHUB_OIDC_PROVIDER_ARN=
```

Use o mesmo conjunto de chaves do `.env.example`. `AWS_ROLE_ARN` é específico do GitHub Actions, porque o workflow precisa assumir a role de deploy antes de executar o CDK.

`S3_BUCKET_NAME` e `CLOUDFRONT_DISTRIBUTION_ID` não são necessários como variables, porque o workflow lê esses valores dos outputs do CDK. `HOSTED_ZONE` não deve existir.

## Criar IAM Role para GitHub Actions

### Opção 1: via CDK

Ative a criação da role no `.env` no primeiro deploy local:

```dotenv
CREATE_GITHUB_OIDC_ROLE=true
GITHUB_OWNER=SEU_USUARIO_OU_ORG
GITHUB_REPO=SEU_REPO
GITHUB_BRANCH=main
```

Depois rode:

```bash
npx cdk deploy aws-cdk-static-site-starter-static-site
```

Use o output `GithubActionsRoleArn` como `AWS_ROLE_ARN` no GitHub.

Se sua conta já tiver um OIDC provider para GitHub, configure também:

```dotenv
GITHUB_OIDC_PROVIDER_ARN=arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com
```

A role criada usa `AdministratorAccess` para simplificar deploys CDK. Em produção, substitua por uma política de menor privilégio que permita apenas CloudFormation/CDK bootstrap, S3, CloudFront, ACM e IAM necessários para esta stack.

### Opção 2: manual

Crie uma IAM Role com trust policy OIDC e anexe permissões suficientes para `cdk deploy`, upload no S3 e invalidation no CloudFront.

## Opções de Cloudflare

### Opção A: simples/manual

Use o console AWS ACM para copiar os CNAMEs de validação e crie os registros manualmente na Cloudflare. Depois crie `CNAME @` e `CNAME www` apontando para o domínio CloudFront. Esta é a opção recomendada para começar.

### Opção B: automatizada

Você pode usar Terraform ou um script separado com Cloudflare API Token para criar os registros DNS. Evite misturar Cloudflare dentro do AWS CDK, porque CDK é a ferramenta de infraestrutura AWS aqui e o provider de Cloudflare não faz parte do CDK oficial.

## SPA Fallback

`ENABLE_SPA_FALLBACK=true` faz CloudFront responder `/index.html` para erros `403` e `404`, útil para SPAs com roteamento client-side.

Se seu site for apenas páginas HTML estáticas sem roteamento SPA, você pode desligar:

```dotenv
ENABLE_SPA_FALLBACK=false
```

## Segurança

- O bucket S3 não tem website hosting público.
- `BlockPublicAccess` está habilitado.
- CloudFront acessa o bucket via OAC, não OAI legado.
- HTTP redireciona para HTTPS.
- O certificado fica no ACM em `us-east-1`.
- O workflow usa OIDC, não access keys fixas.

## Destruir a Stack

Esvazie o bucket antes, porque `autoDeleteObjects` está `false` para evitar custom resources extras:

```bash
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name aws-cdk-static-site-starter-static-site \
  --region eu-west-1 \
  --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucketName'].OutputValue" \
  --output text)

aws s3 rm "s3://${BUCKET_NAME}" --recursive
npx cdk destroy --all
```

Em produção, mude o bucket para `RemovalPolicy.RETAIN` em `lib/static-site-stack.ts`.

## Estimativa de Custo

Para um site pequeno, o custo esperado costuma ficar muito baixo:

- ACM público usado com CloudFront: sem custo para certificado público não exportável.
- S3 Standard: cobrança por armazenamento e requests, normalmente centavos para poucos MB.
- CloudFront: há camada gratuita mensal para uma quantidade relevante de transferência e requests; acima disso, cobra por tráfego e requisições.
- Cloudflare DNS: plano gratuito costuma ser suficiente para DNS.

Alertas de custo:

- Não habilite WAF, logs, CloudFront Functions, Lambda@Edge ou Origin Shield sem motivo.
- Se quiser eliminar os custom resources auxiliares de cross-region do CDK, mantenha a stack principal em `us-east-1` ou importe manualmente o ARN do certificado.
- Invalidation frequente e ampla pode ter custo após a cota gratuita.
- Tráfego alto no CloudFront pode gerar cobrança.
- Buckets com muitos objetos e requests também podem gerar cobrança.
- `AdministratorAccess` na role de deploy é conveniente, mas amplia o impacto de erro no workflow.

## Estrutura

```text
.
├── bin/app.ts
├── lib/
│   ├── config/
│   ├── constructs/
│   ├── outputs/
│   └── stacks/
├── website_src/
├── website_dist/  # gerado por npm run build:site
├── docs/
│   ├── cloudflare-domain-dns-ssl.md
│   ├── cloudflare-domain-dns-ssl.pt-BR.md
│   ├── local-development-setup.md
│   ├── local-development-setup.pt-BR.md
│   └── README.pt-BR.md
├── test/
├── .github/workflows/deploy.yml
├── cdk.json
├── package.json
├── tsconfig.json
└── README.md
```

## Licença

Este projeto usa a [MIT License](../LICENSE).

## Referências

- CloudFront exige certificado ACM em `us-east-1`: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- OAC para S3 no CDK: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.S3OriginAccessControl.html
- Cloudflare DNS: https://developers.cloudflare.com/dns/
