#!/usr/bin/env node
import 'dotenv/config';
import * as cdk from 'aws-cdk-lib';
import { resolveAppConfig } from '../lib/config/app-config';
import { CertificateStack, StaticSiteStack } from '../lib/static-site-stack';

const app = new cdk.App();
const config = resolveAppConfig(app);

const env = {
  account: config.awsAccountId,
  region: config.awsRegion,
};

const certificateStack = new CertificateStack(app, `${config.projectName}-certificate`, {
  env: {
    account: config.awsAccountId,
    region: config.certificateRegion,
  },
  crossRegionReferences: true,
  projectName: config.projectName,
  domainName: config.domainName,
  alternateDomainNames: [config.wwwDomainName],
});

const siteStack = new StaticSiteStack(app, `${config.projectName}-static-site`, {
  env,
  crossRegionReferences: true,
  projectName: config.projectName,
  domainName: config.domainName,
  alternateDomainNames: [config.wwwDomainName],
  certificateArn: certificateStack.certificateArn,
  enableSpaFallback: config.enableSpaFallback,
  createGithubOidcRole: config.github.createOidcRole,
  githubOwner: config.github.owner,
  githubRepo: config.github.repo,
  githubBranch: config.github.branch,
  githubOidcProviderArn: config.github.oidcProviderArn,
});

siteStack.addDependency(certificateStack);

cdk.Tags.of(app).add('Project', config.projectName);
cdk.Tags.of(app).add('ManagedBy', 'aws-cdk');
