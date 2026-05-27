# Local Node.js, npm, and AWS CLI Setup

[Portuguese version](local-development-setup.pt-BR.md)

This guide prepares a local machine to build, test, synthesize, and deploy this AWS CDK static-site skeleton.

## What You Need

- Node.js 22 or newer.
- npm, which is bundled with standard Node.js installs.
- AWS CLI v2.
- AWS credentials with permissions for CDK bootstrap/deploy, CloudFormation, S3, CloudFront, ACM, and IAM.
- A terminal: Terminal on macOS/Linux, PowerShell or Windows Terminal on Windows.

## 1. Check Existing Tools

Run:

```bash
node -v
npm -v
aws --version
```

This project expects Node.js 22 or newer. If `node` or `npm` is missing or too old, install Node.js. If `aws` is missing, install AWS CLI v2.

## 2. Install Node.js and npm

The npm documentation recommends installing Node.js and npm through a Node version manager when possible. A version manager makes upgrades and project-specific versions easier.

### Option A: Node Version Manager

Use a Node version manager supported by your operating system, then install Node.js 22 LTS or newer.

Common choices:

- macOS/Linux: `nvm` or another Node version manager.
- Windows: a Windows-compatible Node version manager, or the official Node.js installer if you prefer a simpler path.

After installation, verify:

```bash
node -v
npm -v
```

### Option B: Official Node.js Installer

If you prefer not to use a version manager:

1. Open the official Node.js download page.
2. Download the LTS installer for your operating system.
3. Run the installer and include npm when prompted.
4. Restart your terminal.
5. Verify:

```bash
node -v
npm -v
```

## 3. Install Project Dependencies

From the repository root:

```bash
npm install
```

For clean CI-style installs, use:

```bash
npm ci
```

Use `npm ci` only when `package-lock.json` is present and you want an install that exactly matches the lockfile.

## 4. Install AWS CLI v2

Install AWS CLI v2 using the official AWS instructions for your operating system.

### macOS

Use the official macOS package installer from AWS, or install with Homebrew if that is your standard local tooling. After installation:

```bash
aws --version
```

### Linux

AWS provides a zip installer for Linux. Follow the official AWS CLI v2 Linux instructions for your CPU architecture, then verify:

```bash
aws --version
```

### Windows

AWS provides an MSI installer for Windows. Install it, open a new PowerShell or Windows Terminal session, then verify:

```powershell
aws --version
```

## 5. Configure AWS Credentials

For a simple local setup, run:

```bash
aws configure
```

You will be prompted for:

- AWS Access Key ID.
- AWS Secret Access Key.
- Default region name, for example `eu-west-1`.
- Default output format, usually `json`.

AWS stores these values in the shared AWS config and credentials files under your home directory. Do not commit credentials into this repository.

If your organization uses AWS IAM Identity Center, SSO, or temporary credentials, configure the AWS CLI according to your organization's standard process instead of long-lived access keys.

## 6. Verify AWS Access

Run:

```bash
aws sts get-caller-identity
```

You should see the AWS account and identity that will run local CDK commands.

## 7. Prepare This Project

Create a local environment file:

```bash
cp .env.example .env
```

Edit `.env` with your account, region, domain, and GitHub repository values.

Then run:

```bash
npm run build
npm run build:site
npm test
npm run synth
```

If these commands pass, the local tooling is ready for CDK bootstrap and deploy.

## 8. CDK Bootstrap

Bootstrap the certificate region and the main stack region:

```bash
npx cdk bootstrap aws://123456789012/us-east-1
npx cdk bootstrap aws://123456789012/eu-west-1
```

Replace the account and regions with your `.env` values. `us-east-1` is required for the CloudFront ACM certificate.

## Troubleshooting

- `node: command not found`: install Node.js and restart the terminal.
- `npm: command not found`: reinstall Node.js with npm included, or check your shell `PATH`.
- `aws: command not found`: install AWS CLI v2 and restart the terminal.
- `Unable to locate credentials`: run `aws configure`, configure SSO, or export temporary credentials using your organization's process.
- CDK deploy uses the wrong account: run `aws sts get-caller-identity` and check `AWS_ACCOUNT_ID` in `.env`.
- Permission errors during CDK deploy: confirm the AWS identity has permissions for CloudFormation, S3, CloudFront, ACM, IAM, and CDK bootstrap resources.

## Official References

- npm guide for installing Node.js and npm: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm/
- Node.js downloads: https://nodejs.org/en/download
- AWS CLI v2 install guide: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
- AWS CLI `configure` command: https://docs.aws.amazon.com/cli/latest/reference/configure/
- AWS CLI configuration files: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
