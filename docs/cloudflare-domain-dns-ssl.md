# Cloudflare Domain, DNS, and SSL/TLS Guide

[Portuguese version](cloudflare-domain-dns-ssl.pt-BR.md)

This guide shows how to prepare Cloudflare for this AWS CDK static-site skeleton. The expected architecture is:

```text
Browser
  -> Cloudflare DNS
  -> CloudFront distribution with ACM certificate
  -> Private S3 bucket through Origin Access Control
```

Cloudflare is used as the authoritative DNS provider. AWS Route 53 is not used.

## 1. Decide How the Domain Will Be Managed

You have two common paths:

- Existing domain at another registrar: add the domain to Cloudflare, then change the authoritative nameservers at your registrar.
- New or transferred domain at Cloudflare Registrar: register or transfer the domain, then manage DNS records directly in Cloudflare.

For this skeleton, either path works as long as Cloudflare becomes the DNS provider for the apex domain, for example `example.com`.

Before changing nameservers, disable DNSSEC at the current registrar if it is enabled. Cloudflare recommends this during onboarding to avoid connectivity errors while nameservers change.

## 2. Add the Domain to Cloudflare

1. Log in to the Cloudflare dashboard.
2. Select **Add a domain**.
3. Enter the apex domain, for example `example.com`, not `www.example.com`.
4. Let Cloudflare scan existing DNS records if this is an existing domain.
5. Review imported records. Keep email-related records such as `MX`, `TXT`, `SPF`, `DKIM`, and `DMARC` if the domain already handles email.
6. Continue until Cloudflare shows the two assigned authoritative nameservers.

Do not add AWS Route 53 hosted-zone configuration to this project. The DNS records are managed in Cloudflare.

## 3. Update Nameservers at the Registrar

At your domain registrar:

1. Open the domain's nameserver settings.
2. Replace the existing nameservers with the two Cloudflare nameservers assigned to your zone.
3. Save the change.
4. Return to Cloudflare and use **Re-check now** if available.

Propagation can take minutes or hours depending on the registrar and previous TTLs. Cloudflare marks the zone as active when it sees the nameserver change.

You can check nameservers from a terminal:

```bash
dig NS example.com +short
```

The result should eventually show Cloudflare nameservers.

## 4. Configure `.env` for This Project

Set your domain values before deploying:

```dotenv
PROJECT_NAME=aws-cdk-static-site-starter
DOMAIN_NAME=example.com
WWW_DOMAIN_NAME=www.example.com

AWS_ACCOUNT_ID=123456789012
AWS_REGION=eu-west-1
CERTIFICATE_REGION=us-east-1
```

`CERTIFICATE_REGION` should stay as `us-east-1` because CloudFront requires ACM certificates in that region.

## 5. Deploy the Certificate Stack and Validate ACM DNS Records

Run the CDK deploy after configuring `.env`:

```bash
npm run build
npx cdk deploy --all
```

On the first deploy, the ACM certificate may wait for DNS validation. In the AWS ACM console in `us-east-1`:

1. Open the certificate for `DOMAIN_NAME`.
2. Copy each DNS validation CNAME record.
3. In Cloudflare, open the zone and go to **DNS**.
4. Create each CNAME record exactly as ACM provides it.
5. Set validation records to **DNS only**.

Cloudflare may display the `Name` field without the domain suffix. For example, ACM might show `_abc.example.com`, while Cloudflare shows `_abc`. That is normal.

You can verify a validation record:

```bash
dig CNAME _abc.example.com +short
```

Wait until ACM marks the certificate as `Issued`.

## 6. Point the Domain to CloudFront

After the CDK deployment creates the CloudFront distribution, copy the `CloudFrontDomainName` output, for example:

```text
d111111abcdef8.cloudfront.net
```

Create DNS records in Cloudflare:

```text
Type   Name   Target
CNAME  @      d111111abcdef8.cloudfront.net
CNAME  www    d111111abcdef8.cloudfront.net
```

Cloudflare supports CNAME flattening for the apex/root record, so `CNAME @` can point to CloudFront.

For the first deployment, keep these records as **DNS only**. This sends visitors directly to CloudFront and keeps the Cloudflare layer limited to DNS while you validate the AWS side.

## 7. Choose the SSL/TLS Mode

There are two practical modes for this project:

### DNS only

If the `@` and `www` records are **DNS only**, Cloudflare does not proxy HTTP traffic. TLS is handled directly by CloudFront using the ACM certificate.

This is the simplest starting point and is the recommended first configuration for this skeleton.

### Proxied through Cloudflare

If you later enable the orange-cloud proxy for `@` or `www`, traffic flows like this:

```text
Browser -> Cloudflare edge certificate -> CloudFront ACM certificate -> S3
```

Use Cloudflare SSL/TLS mode **Full (strict)**. CloudFront presents a publicly trusted ACM certificate that matches your hostname, which is what Full (strict) expects.

Avoid **Flexible** mode. It is not appropriate for this project because the origin already supports HTTPS and CloudFront already redirects HTTP to HTTPS.

Cloudflare Universal SSL is normally issued automatically for active Cloudflare zones. If you enable the proxy and HTTPS is not ready yet, wait for Universal SSL issuance before sending production traffic through Cloudflare.

## 8. Verify the Final Setup

Check DNS:

```bash
dig CNAME www.example.com +short
dig example.com +short
```

Check HTTPS:

```bash
curl -I https://example.com
curl -I https://www.example.com
```

Expected results:

- `HTTP/2 200`, `HTTP/2 301`, or `HTTP/2 304` depending on cache and redirects.
- No certificate name mismatch.
- No Cloudflare `526` error when proxying with Full (strict).

## Troubleshooting

- ACM certificate stays pending: confirm the validation CNAME exists in Cloudflare and is DNS only.
- `www` works but apex does not: confirm `CNAME @` exists and points to the CloudFront distribution domain.
- Browser shows a certificate error: confirm the ACM certificate includes both `DOMAIN_NAME` and `WWW_DOMAIN_NAME`.
- Cloudflare shows `526`: Cloudflare is proxying, but Full (strict) cannot validate the origin certificate. Confirm CloudFront is serving the ACM certificate for the hostname.
- Redirect loop: avoid Cloudflare Flexible SSL. Use DNS only or Full (strict).
- Email breaks after moving DNS: restore the previous `MX`, `TXT`, SPF, DKIM, and DMARC records in Cloudflare.

## Official References

- Cloudflare domains overview: https://developers.cloudflare.com/fundamentals/manage-domains/
- Add a site to Cloudflare: https://developers.cloudflare.com/learning-paths/get-started/add-domain-to-cf/
- Cloudflare DNS proxy status: https://developers.cloudflare.com/dns/manage-dns-records/reference/proxied-dns-records/
- Cloudflare Universal SSL: https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl
- Cloudflare Full (strict): https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/
- CloudFront ACM certificate region requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
