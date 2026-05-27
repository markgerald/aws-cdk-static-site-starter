import { CfnOutput } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface StaticSiteOutputsProps {
  domainName: string;
  alternateDomainNames: string[];
  websiteBucket: s3.IBucket;
  distribution: cloudfront.IDistribution;
  githubActionsRole?: iam.IRole;
}

export function createStaticSiteOutputs(scope: Construct, props: StaticSiteOutputsProps): void {
  if (props.githubActionsRole) {
    new CfnOutput(scope, 'GithubActionsRoleArn', {
      value: props.githubActionsRole.roleArn,
      description: 'OIDC IAM role ARN to use as AWS_ROLE_ARN in GitHub Actions.',
    });
  }

  new CfnOutput(scope, 'WebsiteBucketName', {
    value: props.websiteBucket.bucketName,
    description: 'Private S3 bucket that stores the static website files.',
  });

  new CfnOutput(scope, 'CloudFrontDistributionId', {
    value: props.distribution.distributionId,
    description: 'CloudFront distribution ID used for invalidations.',
  });

  new CfnOutput(scope, 'CloudFrontDomainName', {
    value: props.distribution.distributionDomainName,
    description: 'Target DNS name for Cloudflare CNAME records.',
  });

  new CfnOutput(scope, 'CloudflareRootRecord', {
    value: `${props.domainName} CNAME ${props.distribution.distributionDomainName}`,
    description: 'Create as DNS only in Cloudflare. Cloudflare flattens CNAME records at the zone apex.',
  });

  new CfnOutput(scope, 'CloudflareWwwRecord', {
    value: `${props.alternateDomainNames[0]} CNAME ${props.distribution.distributionDomainName}`,
    description: 'Create as DNS only in Cloudflare.',
  });
}
