import * as cdk from 'aws-cdk-lib';
import { resolveAppConfig } from '../lib/config/app-config';

describe('resolveAppConfig', () => {
  test('builds configuration from environment values', () => {
    const app = new cdk.App();

    const config = resolveAppConfig(app, {
      PROJECT_NAME: 'docs-site',
      DOMAIN_NAME: 'example.org',
      WWW_DOMAIN_NAME: 'www-from-env.example.org',
      AWS_ACCOUNT_ID: '111111111111',
      AWS_REGION: 'us-west-2',
      CERTIFICATE_REGION: 'us-east-1',
      ENABLE_SPA_FALLBACK: 'false',
      CREATE_GITHUB_OIDC_ROLE: 'true',
      GITHUB_OWNER: 'my-org',
      GITHUB_REPO: 'docs-repo',
      GITHUB_BRANCH: 'production',
      GITHUB_OIDC_PROVIDER_ARN: 'arn:aws:iam::111111111111:oidc-provider/token.actions.githubusercontent.com',
    });

    expect(config).toEqual({
      projectName: 'docs-site',
      domainName: 'example.org',
      wwwDomainName: 'www-from-env.example.org',
      awsAccountId: '111111111111',
      awsRegion: 'us-west-2',
      certificateRegion: 'us-east-1',
      enableSpaFallback: false,
      github: {
        createOidcRole: true,
        owner: 'my-org',
        repo: 'docs-repo',
        branch: 'production',
        oidcProviderArn: 'arn:aws:iam::111111111111:oidc-provider/token.actions.githubusercontent.com',
      },
    });
  });

  test('derives www domain from the resolved root domain when no override exists', () => {
    const app = new cdk.App({
      context: {
        domainName: 'example.net',
      },
    });

    const config = resolveAppConfig(app, {});

    expect(config.wwwDomainName).toBe('www.example.net');
  });

  test('allows CDK context to override environment values for ad hoc deploys', () => {
    const app = new cdk.App({
      context: {
        domainName: 'context.example.com',
      },
    });

    const config = resolveAppConfig(app, {
      DOMAIN_NAME: 'env.example.com',
    });

    expect(config.domainName).toBe('context.example.com');
  });
});
