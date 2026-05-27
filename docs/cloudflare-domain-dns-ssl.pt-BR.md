# Tutorial de Domínio, DNS e SSL/TLS na Cloudflare

[English version](cloudflare-domain-dns-ssl.md)

Este tutorial mostra como preparar a Cloudflare para este skeleton de site estático com AWS CDK. A arquitetura esperada é:

```text
Navegador
  -> Cloudflare DNS
  -> CloudFront Distribution com certificado ACM
  -> Bucket S3 privado via Origin Access Control
```

A Cloudflare é usada como provedora DNS autoritativa. AWS Route 53 não é usado.

## 1. Decida Como o Domínio Será Gerenciado

Você tem dois caminhos comuns:

- Domínio existente em outro registrador: adicione o domínio na Cloudflare e depois troque os nameservers autoritativos no registrador.
- Domínio novo ou transferido para Cloudflare Registrar: registre ou transfira o domínio e gerencie os registros DNS diretamente na Cloudflare.

Para este skeleton, qualquer caminho funciona desde que a Cloudflare seja a provedora DNS do domínio raiz, por exemplo `example.com`.

Antes de trocar nameservers, desative DNSSEC no registrador atual se ele estiver habilitado. A Cloudflare recomenda isso durante o onboarding para evitar erros de conectividade enquanto os nameservers mudam.

## 2. Adicione o Domínio na Cloudflare

1. Entre no dashboard da Cloudflare.
2. Selecione **Add a domain**.
3. Informe o domínio raiz, por exemplo `example.com`, não `www.example.com`.
4. Deixe a Cloudflare escanear registros DNS existentes se esse domínio já estiver em uso.
5. Revise os registros importados. Preserve registros de email como `MX`, `TXT`, `SPF`, `DKIM` e `DMARC` se o domínio já usa email.
6. Continue até a Cloudflare mostrar os dois nameservers autoritativos atribuídos à zona.

Não adicione configuração de hosted zone do AWS Route 53 neste projeto. Os registros DNS são gerenciados na Cloudflare.

## 3. Atualize os Nameservers no Registrador

No registrador do domínio:

1. Abra as configurações de nameserver do domínio.
2. Substitua os nameservers atuais pelos dois nameservers fornecidos pela Cloudflare.
3. Salve a alteração.
4. Volte para a Cloudflare e use **Re-check now**, se disponível.

A propagação pode levar minutos ou horas dependendo do registrador e dos TTLs anteriores. A Cloudflare marca a zona como ativa quando detecta a troca dos nameservers.

Você pode checar os nameservers pelo terminal:

```bash
dig NS example.com +short
```

O resultado deve eventualmente mostrar nameservers da Cloudflare.

## 4. Configure o `.env` Deste Projeto

Defina os valores do domínio antes do deploy:

```dotenv
PROJECT_NAME=aws-cdk-static-site-starter
DOMAIN_NAME=example.com
WWW_DOMAIN_NAME=www.example.com

AWS_ACCOUNT_ID=123456789012
AWS_REGION=eu-west-1
CERTIFICATE_REGION=us-east-1
```

`CERTIFICATE_REGION` deve permanecer como `us-east-1`, porque CloudFront exige certificados ACM nessa região.

## 5. Faça Deploy da Stack do Certificado e Valide os CNAMEs do ACM

Rode o deploy do CDK depois de configurar o `.env`:

```bash
npm run build
npx cdk deploy --all
```

No primeiro deploy, o certificado ACM pode ficar aguardando validação DNS. No console do AWS ACM em `us-east-1`:

1. Abra o certificado de `DOMAIN_NAME`.
2. Copie cada registro CNAME de validação DNS.
3. Na Cloudflare, abra a zona e vá em **DNS**.
4. Crie cada CNAME exatamente como o ACM informou.
5. Deixe os registros de validação como **DNS only**.

A Cloudflare pode exibir o campo `Name` sem o sufixo do domínio. Por exemplo, o ACM pode mostrar `_abc.example.com`, enquanto a Cloudflare mostra `_abc`. Isso é normal.

Você pode verificar um registro de validação:

```bash
dig CNAME _abc.example.com +short
```

Aguarde até o ACM marcar o certificado como `Issued`.

## 6. Aponte o Domínio para o CloudFront

Depois que o deploy do CDK criar a distribuição CloudFront, copie o output `CloudFrontDomainName`, por exemplo:

```text
d111111abcdef8.cloudfront.net
```

Crie os registros DNS na Cloudflare:

```text
Type   Name   Target
CNAME  @      d111111abcdef8.cloudfront.net
CNAME  www    d111111abcdef8.cloudfront.net
```

A Cloudflare suporta CNAME flattening no domínio raiz, então `CNAME @` pode apontar para o CloudFront.

No primeiro deploy, deixe esses registros como **DNS only**. Isso envia visitantes diretamente para o CloudFront e limita a Cloudflare ao papel de DNS enquanto você valida o lado AWS.

## 7. Escolha o Modo SSL/TLS

Há dois modos práticos para este projeto:

### DNS only

Se os registros `@` e `www` estiverem como **DNS only**, a Cloudflare não faz proxy do tráfego HTTP. O TLS é tratado diretamente pelo CloudFront usando o certificado ACM.

Esse é o ponto de partida mais simples e recomendado para este skeleton.

### Proxied pela Cloudflare

Se depois você ativar o proxy orange-cloud para `@` ou `www`, o fluxo passa a ser:

```text
Navegador -> certificado Cloudflare edge -> certificado ACM no CloudFront -> S3
```

Use o modo SSL/TLS **Full (strict)** na Cloudflare. O CloudFront apresenta um certificado ACM público e válido para o hostname, que é o que o Full (strict) exige.

Evite o modo **Flexible**. Ele não é adequado para este projeto porque a origem já suporta HTTPS e o CloudFront já redireciona HTTP para HTTPS.

O Universal SSL da Cloudflare normalmente é emitido automaticamente para zonas ativas. Se você ativar o proxy e HTTPS ainda não estiver pronto, aguarde a emissão do Universal SSL antes de enviar tráfego de produção pela Cloudflare.

## 8. Verifique a Configuração Final

Cheque DNS:

```bash
dig CNAME www.example.com +short
dig example.com +short
```

Cheque HTTPS:

```bash
curl -I https://example.com
curl -I https://www.example.com
```

Resultados esperados:

- `HTTP/2 200`, `HTTP/2 301` ou `HTTP/2 304`, dependendo de cache e redirects.
- Nenhum erro de nome no certificado.
- Nenhum erro Cloudflare `526` ao usar proxy com Full (strict).

## Troubleshooting

- Certificado ACM continua pendente: confirme se o CNAME de validação existe na Cloudflare e está como DNS only.
- `www` funciona, mas o domínio raiz não: confirme se `CNAME @` existe e aponta para o domínio da distribuição CloudFront.
- Navegador mostra erro de certificado: confirme se o certificado ACM inclui `DOMAIN_NAME` e `WWW_DOMAIN_NAME`.
- Cloudflare mostra `526`: a Cloudflare está proxyando, mas Full (strict) não conseguiu validar o certificado da origem. Confirme se o CloudFront está servindo o certificado ACM para o hostname.
- Loop de redirect: evite Cloudflare Flexible SSL. Use DNS only ou Full (strict).
- Email parou após mover DNS: restaure os registros `MX`, `TXT`, SPF, DKIM e DMARC anteriores na Cloudflare.

## Referências Oficiais

- Visão geral de domínios na Cloudflare: https://developers.cloudflare.com/fundamentals/manage-domains/
- Adicionar um site à Cloudflare: https://developers.cloudflare.com/learning-paths/get-started/add-domain-to-cf/
- Proxy status no DNS da Cloudflare: https://developers.cloudflare.com/dns/manage-dns-records/reference/proxied-dns-records/
- Cloudflare Universal SSL: https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl
- Cloudflare Full (strict): https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/
- Requisitos de região de certificado ACM no CloudFront: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
