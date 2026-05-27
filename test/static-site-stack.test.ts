import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { CertificateStack, StaticSiteStack } from '../lib/static-site-stack';

const defaultProps = {
  projectName: 'aws-cdk-static-site-starter',
  domainName: 'example.com',
  alternateDomainNames: ['www.example.com'],
};

function createStaticSiteTemplate(props: Partial<ConstructorParameters<typeof StaticSiteStack>[2]> = {}) {
  const app = new cdk.App();
  const stack = new StaticSiteStack(app, 'TestStaticSiteStack', {
    env: {
      account: '123456789012',
      region: 'eu-west-1',
    },
    ...defaultProps,
    certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test-certificate',
    enableSpaFallback: true,
    createGithubOidcRole: false,
    githubOwner: 'example-owner',
    githubRepo: 'example-repo',
    githubBranch: 'main',
    ...props,
  });

  return Template.fromStack(stack);
}

describe('CertificateStack', () => {
  test('creates a DNS validated ACM certificate for root and www domains in us-east-1', () => {
    const app = new cdk.App();
    const stack = new CertificateStack(app, 'TestCertificateStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      ...defaultProps,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::CertificateManager::Certificate', {
      DomainName: 'example.com',
      SubjectAlternativeNames: ['www.example.com'],
      ValidationMethod: 'DNS',
    });
  });

  test('rejects certificate creation outside us-east-1', () => {
    const app = new cdk.App();

    expect(
      () =>
        new CertificateStack(app, 'InvalidCertificateStack', {
          env: {
            account: '123456789012',
            region: 'eu-west-1',
          },
          ...defaultProps,
        }),
    ).toThrow('CloudFront requires the ACM certificate to be created in us-east-1.');
  });
});

describe('StaticSiteStack', () => {
  test('creates a private encrypted S3 bucket with public access blocked', () => {
    const template = createStaticSiteTemplate();

    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256',
            },
          },
        ],
      },
      OwnershipControls: {
        Rules: [
          {
            ObjectOwnership: 'BucketOwnerEnforced',
          },
        ],
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('uses CloudFront OAC with SigV4 and does not create a legacy OAI resource', () => {
    const template = createStaticSiteTemplate();

    template.resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 0);
    template.hasResourceProperties('AWS::CloudFront::OriginAccessControl', {
      OriginAccessControlConfig: {
        OriginAccessControlOriginType: 's3',
        SigningBehavior: 'always',
        SigningProtocol: 'sigv4',
      },
    });
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        Origins: [
          Match.objectLike({
            OriginAccessControlId: Match.anyValue(),
            S3OriginConfig: {
              OriginAccessIdentity: '',
            },
          }),
        ],
      },
    });
  });

  test('restricts S3 reads to the CloudFront distribution service principal', () => {
    const template = createStaticSiteTemplate();

    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 's3:GetObject',
            Effect: 'Allow',
            Principal: {
              Service: 'cloudfront.amazonaws.com',
            },
            Condition: {
              StringEquals: {
                'AWS:SourceArn': Match.anyValue(),
              },
            },
          }),
        ]),
      },
    });
  });

  test('configures CloudFront for HTTPS, custom domains, optimized static caching and SPA fallback', () => {
    const template = createStaticSiteTemplate();

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        Aliases: ['example.com', 'www.example.com'],
        DefaultRootObject: 'index.html',
        Enabled: true,
        HttpVersion: 'http2and3',
        IPV6Enabled: true,
        PriceClass: 'PriceClass_100',
        DefaultCacheBehavior: {
          AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
          CachedMethods: ['GET', 'HEAD', 'OPTIONS'],
          CachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
          Compress: true,
          ViewerProtocolPolicy: 'redirect-to-https',
        },
        CustomErrorResponses: [
          {
            ErrorCachingMinTTL: 0,
            ErrorCode: 403,
            ResponseCode: 200,
            ResponsePagePath: '/index.html',
          },
          {
            ErrorCachingMinTTL: 0,
            ErrorCode: 404,
            ResponseCode: 200,
            ResponsePagePath: '/index.html',
          },
        ],
        ViewerCertificate: {
          AcmCertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test-certificate',
          MinimumProtocolVersion: 'TLSv1.2_2021',
          SslSupportMethod: 'sni-only',
        },
      },
    });
  });

  test('omits SPA fallback responses when disabled', () => {
    const template = createStaticSiteTemplate({
      enableSpaFallback: false,
    });

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.not(
        Match.objectLike({
          CustomErrorResponses: Match.anyValue(),
        }),
      ),
    });
  });

  test('can create a GitHub Actions OIDC role scoped to one repository branch', () => {
    const template = createStaticSiteTemplate({
      createGithubOidcRole: true,
      githubOwner: 'my-org',
      githubRepo: 'my-repo',
      githubBranch: 'main',
    });

    template.hasResourceProperties('Custom::AWSCDKOpenIdConnectProvider', {
      ClientIDList: ['sts.amazonaws.com'],
      Url: 'https://token.actions.githubusercontent.com',
    });

    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          Match.objectLike({
            Action: 'sts:AssumeRoleWithWebIdentity',
            Condition: {
              StringEquals: {
                'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                'token.actions.githubusercontent.com:sub': 'repo:my-org/my-repo:ref:refs/heads/main',
              },
            },
            Effect: 'Allow',
          }),
        ],
      },
      ManagedPolicyArns: [
        {
          'Fn::Join': [
            '',
            [
              'arn:',
              {
                Ref: 'AWS::Partition',
              },
              ':iam::aws:policy/AdministratorAccess',
            ],
          ],
        },
      ],
    });
  });
});
