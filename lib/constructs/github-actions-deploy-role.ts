import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface GithubActionsDeployRoleProps {
  projectName: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  githubOidcProviderArn?: string;
}

export function createGithubActionsDeployRole(scope: Construct, props: GithubActionsDeployRoleProps): iam.Role {
  const provider = props.githubOidcProviderArn
    ? iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(scope, 'GithubOidcProvider', props.githubOidcProviderArn)
    : new iam.OpenIdConnectProvider(scope, 'GithubOidcProvider', {
        url: 'https://token.actions.githubusercontent.com',
        clientIds: ['sts.amazonaws.com'],
      });

  const roleNamePrefix = props.projectName
    .toLowerCase()
    .replace(/[^a-z0-9+=,.@_-]/g, '-')
    .slice(0, 35);

  const role = new iam.Role(scope, 'GithubActionsDeployRole', {
    roleName: `${roleNamePrefix}-github-actions-deploy`,
    description: `Allows ${props.githubOwner}/${props.githubRepo} GitHub Actions to deploy ${props.projectName}.`,
    assumedBy: new iam.OpenIdConnectPrincipal(provider).withConditions({
      StringEquals: {
        'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        'token.actions.githubusercontent.com:sub': `repo:${props.githubOwner}/${props.githubRepo}:ref:refs/heads/${props.githubBranch}`,
      },
    }),
  });

  // CDK deployments need broad permissions unless you build a tightly scoped deployment role separately.
  role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));

  return role;
}
