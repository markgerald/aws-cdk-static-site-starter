# AWS CDK Static Site Starter

[![CI](https://github.com/markgerald/aws-cdk-static-site-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/markgerald/aws-cdk-static-site-starter/actions/workflows/ci.yml)

[Portuguese version](docs/README.pt-BR.md)

Reusable AWS CDK starter for a static website with private S3, CloudFront OAC, ACM, Cloudflare DNS, and GitHub Actions deploys.

## Documentation

- [Local Node.js, npm, and AWS CLI setup](docs/local-development-setup.md)
- [Cloudflare domain, DNS, and SSL/TLS guide](docs/cloudflare-domain-dns-ssl.md)
- [Portuguese version](docs/cloudflare-domain-dns-ssl.pt-BR.md)

## Architecture

```text
User
  -> Cloudflare DNS, preferably DNS only at first
  -> CloudFront distribution with HTTPS and HTTP -> HTTPS redirect
  -> Origin Access Control with SigV4 signing
  -> Private S3 bucket with Block Public Access

GitHub Actions
  -> OIDC to an AWS IAM role
  -> npm run build:site
  -> cdk deploy
  -> aws s3 sync website_dist/
  -> cloudfront create-invalidation

ACM us-east-1
  <- DNS validation CNAMEs created manually in Cloudflare
```

This project intentionally avoids Route 53, WAF, Lambda@Edge, CloudFront Functions, and CloudFront logs. Those can be useful in larger environments, but they are not required for a small React site served as static files.

The example keeps the main stack in `eu-west-1` and the certificate stack in `us-east-1`, so CDK creates cross-region reference helper resources. To avoid that, run the main stack in `us-east-1` too or adapt the project to import an already validated `certificateArn`.

## Prerequisites

- An AWS account with permissions for CDK, CloudFormation, S3, CloudFront, ACM, and IAM.
- Node.js 22 or newer.
- AWS CLI configured for local deploys.
- AWS CDK CLI through the project dependency.
- A domain already using Cloudflare as authoritative DNS.
- Permission in Cloudflare to create DNS records.

## Initial Configuration

This repository is meant to be adapted by other projects. Copy the environment contract and edit it for your AWS account, domain, and GitHub repository:

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

The `.env` file is loaded automatically by CDK for local deploys and must not be committed. In production, configure the same keys as GitHub Actions Repository Variables. `cdk.json` only contains the app command; project parameters live in the environment.

The ACM certificate for CloudFront must be in `us-east-1`. The S3 bucket and main stack can stay in `eu-west-1` or another AWS region.

## Install Dependencies

```bash
npm install
```

Commit `package-lock.json` so GitHub Actions can use `npm ci`.

## CDK Bootstrap

Bootstrap both regions because the certificate is in `us-east-1` and the main stack may be in another region:

```bash
npx cdk bootstrap aws://123456789012/us-east-1
npx cdk bootstrap aws://123456789012/eu-west-1
```

Replace `123456789012` and `eu-west-1` with your values.

## Local Deploy

```bash
npm run build
npm run build:site
npm test

npx cdk deploy --all \
  --require-approval never
```

On the first run, the ACM certificate stack will wait for DNS validation. Open ACM in `us-east-1`, find the certificate for your domain, and copy the validation CNAME records.

## Validate the ACM Certificate in Cloudflare

In Cloudflare:

1. Open the domain zone.
2. Go to **DNS**.
3. Create the CNAME records shown by ACM.
4. Keep validation records as **DNS only**.
5. Wait until ACM marks the certificate as `Issued`.

Cloudflare may automatically remove the domain suffix from the `Name` field. That is normal. For example, `_abc.example.com` may appear as `_abc`.

## Configure Cloudflare DNS

After CDK creates the CloudFront distribution, copy the `CloudFrontDomainName` output, for example:

```text
d111111abcdef8.cloudfront.net
```

Create these records:

```text
Type   Name   Target
CNAME  @      d111111abcdef8.cloudfront.net
CNAME  www    d111111abcdef8.cloudfront.net
```

Cloudflare uses CNAME flattening for the root domain. Start with **DNS only** records to avoid double proxying between Cloudflare and CloudFront. If you later enable Cloudflare proxying, use TLS `Full (strict)` and test cache, headers, and redirects carefully.

Do not create a `HOSTED_ZONE` variable and do not configure Route 53. This project does not use an AWS hosted zone.

## Publish Website Files

After the infrastructure deploy, upload the website:

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

GitHub Actions runs these commands automatically on every push to `main`.

## Tests

This project uses Jest, `ts-jest`, and `aws-cdk-lib/assertions` for CDK unit tests.

```bash
npm test
npm run test:coverage
```

The tests in `test/static-site-stack.test.ts` cover ACM DNS validation, private encrypted S3, CloudFront OAC, bucket policy restrictions, aliases, HTTPS redirects, optimized static caching, optional SPA fallback, and the optional GitHub Actions OIDC role.

The `.github/workflows/ci.yml` workflow runs on pull requests and pushes to `main`, executing the TypeScript build, site build, tests, and `cdk synth` without AWS credentials. The deploy workflow also runs tests before applying infrastructure.

## GitHub Actions with OIDC

The workflow lives at `.github/workflows/deploy.yml`. It performs checkout, AWS OIDC authentication, dependency installation, TypeScript build, site build, tests, `cdk deploy`, CDK output reads, S3 upload, and CloudFront invalidation.

Configure these **Repository Variables** in GitHub:

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

Use the same key set as `.env.example`. `AWS_ROLE_ARN` is specific to GitHub Actions because the workflow must assume the deploy role before running CDK.

`S3_BUCKET_NAME` and `CLOUDFRONT_DISTRIBUTION_ID` are not required as variables because the workflow reads them from CDK outputs. `HOSTED_ZONE` should not exist.

## Create the GitHub Actions IAM Role

### Option 1: via CDK

Enable role creation in `.env` for the first local deploy:

```dotenv
CREATE_GITHUB_OIDC_ROLE=true
GITHUB_OWNER=YOUR_USER_OR_ORG
GITHUB_REPO=YOUR_REPO
GITHUB_BRANCH=main
```

Then run:

```bash
npx cdk deploy aws-cdk-static-site-starter-static-site
```

Use the `GithubActionsRoleArn` output as `AWS_ROLE_ARN` in GitHub.

If your account already has a GitHub OIDC provider, configure:

```dotenv
GITHUB_OIDC_PROVIDER_ARN=arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com
```

The generated role uses `AdministratorAccess` to keep CDK deploys simple. For production, replace it with least-privilege permissions for the required CloudFormation/CDK bootstrap, S3, CloudFront, ACM, and IAM actions.

### Option 2: manual

Create an IAM role with an OIDC trust policy and attach permissions sufficient for `cdk deploy`, S3 upload, and CloudFront invalidation.

## Cloudflare Options

### Option A: simple/manual

Use the AWS ACM console to copy validation CNAMEs and create them manually in Cloudflare. Then create `CNAME @` and `CNAME www` pointing to the CloudFront domain. This is the recommended starting point.

### Option B: automated

Use Terraform or a separate script with a Cloudflare API token to create DNS records. Avoid mixing Cloudflare into this AWS CDK app because CDK is being used here as the AWS infrastructure tool, and the Cloudflare provider is not part of the official AWS CDK.

## SPA Fallback

`ENABLE_SPA_FALLBACK=true` makes CloudFront serve `/index.html` for `403` and `404` responses, which is useful for single-page apps with client-side routing.

For plain static HTML sites without SPA routing, disable it:

```dotenv
ENABLE_SPA_FALLBACK=false
```

## Security

- The S3 bucket does not use public website hosting.
- `BlockPublicAccess` is enabled.
- CloudFront accesses S3 through OAC, not legacy OAI.
- HTTP redirects to HTTPS.
- The ACM certificate is in `us-east-1`.
- The workflow uses OIDC, not long-lived AWS access keys.

## Destroy the Stack

Empty the bucket first because `autoDeleteObjects` is `false` to avoid extra custom resources:

```bash
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name aws-cdk-static-site-starter-static-site \
  --region eu-west-1 \
  --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucketName'].OutputValue" \
  --output text)

aws s3 rm "s3://${BUCKET_NAME}" --recursive
npx cdk destroy --all
```

For production, change the bucket to `RemovalPolicy.RETAIN` in `lib/static-site-stack.ts`.

## Cost Estimate

For a small site, expected cost is usually very low:

- Public ACM certificates used with CloudFront have no charge when they are not exported.
- S3 Standard charges for storage and requests, usually cents for a small site.
- CloudFront has a monthly free tier for a meaningful amount of traffic and requests; above that, transfer and request charges apply.
- Cloudflare DNS is usually covered by the free plan.

Cost warnings:

- Do not enable WAF, logs, CloudFront Functions, Lambda@Edge, or Origin Shield without a clear reason.
- To remove CDK cross-region helper resources, keep the main stack in `us-east-1` or import the certificate ARN manually.
- Frequent broad invalidations can cost money after the free quota.
- High CloudFront traffic can incur charges.
- Buckets with many objects and requests can incur charges.
- `AdministratorAccess` on the deploy role is convenient, but it increases the impact of workflow mistakes.

## Project Structure

```text
.
├── bin/app.ts
├── lib/
│   ├── config/
│   ├── constructs/
│   ├── outputs/
│   └── stacks/
├── website_src/
├── website_dist/  # generated by npm run build:site
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

## License

This project is licensed under the [MIT License](LICENSE).

## References

- CloudFront requires ACM certificates in `us-east-1`: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- OAC for S3 in CDK: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront.S3OriginAccessControl.html
- Cloudflare DNS: https://developers.cloudflare.com/dns/
