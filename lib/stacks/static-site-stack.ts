import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { createGithubActionsDeployRole } from '../constructs/github-actions-deploy-role';
import { createStaticSiteDistribution } from '../constructs/static-site-distribution';
import { createWebsiteBucket } from '../constructs/website-bucket';
import { createStaticSiteOutputs } from '../outputs/static-site-outputs';

export interface StaticSiteStackProps extends StackProps {
  projectName: string;
  domainName: string;
  alternateDomainNames: string[];
  certificateArn: string;
  enableSpaFallback: boolean;
  createGithubOidcRole: boolean;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  githubOidcProviderArn?: string;
}

export class StaticSiteStack extends Stack {
  constructor(scope: Construct, id: string, props: StaticSiteStackProps) {
    super(scope, id, props);

    const websiteBucket = createWebsiteBucket(this);
    const distribution = createStaticSiteDistribution(this, {
      projectName: props.projectName,
      domainName: props.domainName,
      alternateDomainNames: props.alternateDomainNames,
      certificateArn: props.certificateArn,
      websiteBucket,
      enableSpaFallback: props.enableSpaFallback,
    });

    const githubActionsRole = props.createGithubOidcRole
      ? createGithubActionsDeployRole(this, {
          projectName: props.projectName,
          githubOwner: props.githubOwner,
          githubRepo: props.githubRepo,
          githubBranch: props.githubBranch,
          githubOidcProviderArn: props.githubOidcProviderArn,
        })
      : undefined;

    createStaticSiteOutputs(this, {
      domainName: props.domainName,
      alternateDomainNames: props.alternateDomainNames,
      websiteBucket,
      distribution,
      githubActionsRole,
    });
  }
}
