import * as cdk from 'aws-cdk-lib';

export interface GithubDeploymentConfig {
  createOidcRole: boolean;
  owner: string;
  repo: string;
  branch: string;
  oidcProviderArn?: string;
}

export interface AppConfig {
  projectName: string;
  domainName: string;
  wwwDomainName: string;
  awsAccountId: string;
  awsRegion: string;
  certificateRegion: string;
  enableSpaFallback: boolean;
  github: GithubDeploymentConfig;
}

type Environment = Partial<Record<string, string | undefined>>;

export function resolveAppConfig(app: cdk.App, environment: Environment = process.env): AppConfig {
  const projectName = configString(app, environment, 'projectName', 'PROJECT_NAME', 'aws-cdk-static-site-starter');
  const domainName = configString(app, environment, 'domainName', 'DOMAIN_NAME', 'example.com');
  const wwwDomainName = configString(app, environment, 'wwwDomainName', 'WWW_DOMAIN_NAME', `www.${domainName}`);

  return {
    projectName,
    domainName,
    wwwDomainName,
    awsAccountId: configString(
      app,
      environment,
      'awsAccountId',
      'AWS_ACCOUNT_ID',
      environment.CDK_DEFAULT_ACCOUNT ?? '123456789012',
    ),
    awsRegion: configString(
      app,
      environment,
      'awsRegion',
      'AWS_REGION',
      environment.CDK_DEFAULT_REGION ?? 'eu-west-1',
    ),
    certificateRegion: configString(app, environment, 'certificateRegion', 'CERTIFICATE_REGION', 'us-east-1'),
    enableSpaFallback: configBoolean(app, environment, 'enableSpaFallback', 'ENABLE_SPA_FALLBACK', true),
    github: {
      createOidcRole: configBoolean(app, environment, 'createGithubOidcRole', 'CREATE_GITHUB_OIDC_ROLE', false),
      owner: configString(app, environment, 'githubOwner', 'GITHUB_OWNER', 'my-github-user'),
      repo: configString(app, environment, 'githubRepo', 'GITHUB_REPO', 'aws-cdk-static-site-starter'),
      branch: configString(app, environment, 'githubBranch', 'GITHUB_BRANCH', 'main'),
      oidcProviderArn: optionalConfigString(app, environment, 'githubOidcProviderArn', 'GITHUB_OIDC_PROVIDER_ARN'),
    },
  };
}

function configString(
  app: cdk.App,
  environment: Environment,
  contextKey: string,
  environmentKey: string,
  fallback: string,
): string {
  const value = app.node.tryGetContext(contextKey);
  const environmentValue = environment[environmentKey];

  if (value !== undefined && value !== null && value !== '') {
    return String(value);
  }

  return environmentValue === undefined || environmentValue === null || environmentValue === ''
    ? fallback
    : environmentValue;
}

function optionalConfigString(
  app: cdk.App,
  environment: Environment,
  contextKey: string,
  environmentKey: string,
): string | undefined {
  const value = app.node.tryGetContext(contextKey);
  const environmentValue = environment[environmentKey];

  if (value !== undefined && value !== null && value !== '') {
    return String(value);
  }

  return environmentValue === undefined || environmentValue === null || environmentValue === ''
    ? undefined
    : environmentValue;
}

function configBoolean(
  app: cdk.App,
  environment: Environment,
  contextKey: string,
  environmentKey: string,
  fallback: boolean,
): boolean {
  const value = app.node.tryGetContext(contextKey);
  const environmentValue = environment[environmentKey];

  if (value !== undefined && value !== null && value !== '') {
    return parseBoolean(value);
  }

  return environmentValue === undefined || environmentValue === null || environmentValue === ''
    ? fallback
    : parseBoolean(environmentValue);
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  return String(value).toLowerCase() === 'true';
}
