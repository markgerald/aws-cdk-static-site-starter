import { Duration } from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface StaticSiteDistributionProps {
  projectName: string;
  domainName: string;
  alternateDomainNames: string[];
  certificateArn: string;
  websiteBucket: s3.IBucket;
  enableSpaFallback: boolean;
}

export function createStaticSiteDistribution(
  scope: Construct,
  props: StaticSiteDistributionProps,
): cloudfront.Distribution {
  const certificate = acm.Certificate.fromCertificateArn(scope, 'ImportedSiteCertificate', props.certificateArn);

  const originAccessControl = new cloudfront.S3OriginAccessControl(scope, 'OriginAccessControl', {
    description: `OAC for ${props.projectName} private S3 origin`,
  });

  return new cloudfront.Distribution(scope, 'Distribution', {
    comment: `${props.projectName} static website`,
    defaultRootObject: 'index.html',
    domainNames: [props.domainName, ...props.alternateDomainNames],
    certificate,
    enableIpv6: true,
    enableLogging: false,
    httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    defaultBehavior: {
      origin: origins.S3BucketOrigin.withOriginAccessControl(props.websiteBucket, {
        originAccessControl,
        originAccessLevels: [cloudfront.AccessLevel.READ],
      }),
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      compress: true,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    },
    errorResponses: props.enableSpaFallback
      ? [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: Duration.minutes(0),
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: Duration.minutes(0),
          },
        ]
      : undefined,
  });
}
