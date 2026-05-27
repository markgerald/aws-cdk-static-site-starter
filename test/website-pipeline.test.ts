import * as fs from 'node:fs';
import * as path from 'node:path';

const repoRoot = path.join(__dirname, '..');

describe('website build pipeline', () => {
  test('builds React source before CI synth and deploys the built static output', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    const ciWorkflow = fs.readFileSync(path.join(repoRoot, '.github/workflows/ci.yml'), 'utf8');
    const deployWorkflow = fs.readFileSync(path.join(repoRoot, '.github/workflows/deploy.yml'), 'utf8');
    const oldDirectoryPrefix = ['demo', 'website', ''].join('_');

    expect(fs.existsSync(path.join(repoRoot, 'website_src/src/App.tsx'))).toBe(true);
    expect(packageJson.scripts['build:site']).toBe('vite build --config website_src/vite.config.ts');
    expect(packageJson.scripts['build:all']).toBe('npm run build && npm run build:site');
    expect(ciWorkflow).toContain('npm run build:site');
    expect(deployWorkflow).toContain('npm run build:site');
    expect(deployWorkflow).toContain('aws s3 sync website_dist/ "s3://${S3_BUCKET_NAME}"');
    expect(deployWorkflow).toContain('CERTIFICATE_REGION: ${{ vars.CERTIFICATE_REGION }}');
    expect(deployWorkflow).toContain('ENABLE_SPA_FALLBACK: ${{ vars.ENABLE_SPA_FALLBACK }}');
    expect(deployWorkflow).toContain('CREATE_GITHUB_OIDC_ROLE: ${{ vars.CREATE_GITHUB_OIDC_ROLE }}');
    expect(deployWorkflow).not.toContain('--context awsAccountId=');
    expect(deployWorkflow).not.toContain(oldDirectoryPrefix);
  });

  test('documents the env file contract for local and GitHub Actions configuration', () => {
    const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
    const portugueseReadme = fs.readFileSync(path.join(repoRoot, 'docs', 'README.pt-BR.md'), 'utf8');
    const cloudflareGuide = fs.readFileSync(path.join(repoRoot, 'docs', 'cloudflare-domain-dns-ssl.md'), 'utf8');
    const portugueseCloudflareGuide = fs.readFileSync(
      path.join(repoRoot, 'docs', 'cloudflare-domain-dns-ssl.pt-BR.md'),
      'utf8',
    );
    const localSetupGuide = fs.readFileSync(path.join(repoRoot, 'docs', 'local-development-setup.md'), 'utf8');
    const portugueseLocalSetupGuide = fs.readFileSync(
      path.join(repoRoot, 'docs', 'local-development-setup.pt-BR.md'),
      'utf8',
    );
    const envExample = fs.readFileSync(path.join(repoRoot, '.env.example'), 'utf8');
    const cdkJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'cdk.json'), 'utf8'));

    expect(JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).name).toBe(
      'aws-cdk-static-site-starter',
    );
    expect(cdkJson.context).toBeUndefined();
    expect(envExample).toContain('PROJECT_NAME=aws-cdk-static-site-starter');
    expect(envExample).toContain('DOMAIN_NAME=example.com');
    expect(envExample).toContain('CREATE_GITHUB_OIDC_ROLE=false');
    expect(readme).toContain('cp .env.example .env');
    expect(readme).toContain('[Portuguese version](docs/README.pt-BR.md)');
    expect(readme).toContain(
      '[![CI](https://github.com/markgerald/aws-cdk-static-site-starter/actions/workflows/ci.yml/badge.svg)]',
    );
    expect(readme).toContain(
      'Reusable AWS CDK starter for a static website with private S3, CloudFront OAC, ACM, Cloudflare DNS, and GitHub Actions deploys.',
    );
    expect(readme).toContain('[Cloudflare domain, DNS, and SSL/TLS guide](docs/cloudflare-domain-dns-ssl.md)');
    expect(readme).toContain('[Local Node.js, npm, and AWS CLI setup](docs/local-development-setup.md)');
    expect(readme).toContain('In production, configure the same keys as GitHub Actions Repository Variables');
    expect(readme).toContain('## License');
    expect(readme).toContain('This project is licensed under the [MIT License](LICENSE).');
    expect(readme).not.toContain('Projeto completo para hospedar');
    expect(fs.readFileSync(path.join(repoRoot, 'LICENSE'), 'utf8')).toContain('MIT License');
    expect(portugueseReadme).toContain(
      'Starter reutilizável de AWS CDK para site estático com S3 privado, CloudFront OAC, ACM, Cloudflare DNS e deploys via GitHub Actions.',
    );
    expect(portugueseReadme).toContain('[Tutorial de domínio, DNS e SSL/TLS na Cloudflare](cloudflare-domain-dns-ssl.pt-BR.md)');
    expect(portugueseReadme).toContain('[Instalação local de Node.js, npm e AWS CLI](local-development-setup.pt-BR.md)');
    expect(portugueseReadme).toContain('Em produção, configure as mesmas chaves como GitHub Actions Repository Variables');
    expect(cloudflareGuide).toContain('[Portuguese version](cloudflare-domain-dns-ssl.pt-BR.md)');
    expect(cloudflareGuide).toContain('Full (strict)');
    expect(cloudflareGuide).toContain('https://developers.cloudflare.com/fundamentals/manage-domains/');
    expect(portugueseCloudflareGuide).toContain('[English version](cloudflare-domain-dns-ssl.md)');
    expect(portugueseCloudflareGuide).toContain('Full (strict)');
    expect(portugueseCloudflareGuide).toContain('https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/');
    expect(localSetupGuide).toContain('[Portuguese version](local-development-setup.pt-BR.md)');
    expect(localSetupGuide).toContain('node -v');
    expect(localSetupGuide).toContain('aws configure');
    expect(localSetupGuide).toContain('https://docs.npmjs.com/downloading-and-installing-node-js-and-npm/');
    expect(localSetupGuide).toContain('https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html');
    expect(portugueseLocalSetupGuide).toContain('[English version](local-development-setup.md)');
    expect(portugueseLocalSetupGuide).toContain('node -v');
    expect(portugueseLocalSetupGuide).toContain('aws configure');
  });

  test('does not reference the old website directory names', () => {
    const oldSourceDirectory = ['demo', 'website', 'src'].join('_');
    const oldDistDirectory = ['demo', 'website', 'dist'].join('_');
    const checkedFiles = [
      'AGENTS.md',
      'README.md',
      'docs/README.pt-BR.md',
      'package.json',
      'tsconfig.json',
      '.gitignore',
      '.github/workflows/deploy.yml',
      'website_src/vite.config.ts',
    ];

    for (const file of checkedFiles) {
      const contents = fs.readFileSync(path.join(repoRoot, file), 'utf8');
      expect(contents).not.toContain(oldSourceDirectory);
      expect(contents).not.toContain(oldDistDirectory);
    }
  });
});
