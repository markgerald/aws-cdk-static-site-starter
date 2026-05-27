# AWS CDK Static Site Starter — Architecture

Reusable AWS CDK starter for a static website. Private S3, CloudFront with Origin Access Control (OAC), ACM in us-east-1, Cloudflare as authoritative DNS, GitHub Actions OIDC deploys.

## Runtime Flow

1. **User** issues HTTPS request to the configured domain.
2. **Cloudflare DNS** resolves the CNAME to the CloudFront distribution hostname (`d*.cloudfront.net`). Cloudflare runs DNS-only at first; proxying is opt-in.
3. **CloudFront** terminates TLS (cert from ACM us-east-1), redirects HTTP to HTTPS, and serves static assets. SPA fallback rewrites 403/404 to `/index.html` when `ENABLE_SPA_FALLBACK=true`.
4. **OAC (SigV4)** signs every origin request so only the distribution can read the bucket.
5. **S3 (private)** holds `website_dist/`. Block Public Access enabled; bucket policy allows only the CloudFront distribution.

## Deploy Flow

1. **GitHub Actions** (`.github/workflows/ci.yml`) runs on push to `main`.
2. **OIDC AssumeRole** exchanges the workflow's OIDC token for short-lived AWS credentials on an IAM role with a trust policy scoped to `GITHUB_OWNER/GITHUB_REPO:ref:refs/heads/GITHUB_BRANCH`.
3. **`cdk deploy`** triggers CloudFormation in `eu-west-1` (main stack) and `us-east-1` (cert stack). CDK creates cross-region reference helpers automatically.
4. **`aws s3 sync website_dist/`** uploads the built artifacts.
5. **`cloudfront create-invalidation`** clears the edge cache for the deployed paths.

## Services

| Service | Purpose |
|---|---|
| CloudFront | Global edge CDN, TLS termination, OAC to S3, optional SPA fallback |
| S3 (private) | Static asset origin, Block Public Access |
| ACM (us-east-1) | TLS certificate for CloudFront; DNS-validated via Cloudflare CNAMEs (manual) |
| IAM Role | OIDC trust for GitHub Actions; least-privilege deploy permissions |
| CloudFormation | Provisions and updates the two stacks via CDK |
| Cloudflare DNS | Authoritative DNS; CNAME apex/subdomain to CloudFront |
| GitHub Actions | CI/CD: build site, `cdk deploy`, sync, invalidate |

## Design Decisions

- **No Route 53**: Cloudflare already authoritative; avoids dual-DNS cost and split-brain risk.
- **No WAF / Lambda@Edge / CloudFront Functions / logs**: out of scope for a small static site; add later if traffic warrants.
- **Cross-region split (eu-west-1 + us-east-1)**: ACM for CloudFront must live in us-east-1; main stack stays close to the team's primary region. To avoid the cross-region helpers, run the main stack in us-east-1 too, or import a pre-validated `certificateArn`.
- **OAC over OAI**: OAC supports SigV4 and is the current AWS-recommended pattern.
- **OIDC instead of long-lived IAM user keys**: short-lived creds, no secrets stored in GitHub.

## Files

- `architecture.drawio` — editable diagram (open with draw.io / diagrams.net).
- `architecture.drawio.png` — exported PNG (if generated).
