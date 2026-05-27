import { RemovalPolicy } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export function createWebsiteBucket(scope: Construct): s3.Bucket {
  return new s3.Bucket(scope, 'WebsiteBucket', {
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    encryption: s3.BucketEncryption.S3_MANAGED,
    enforceSSL: true,
    objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
    publicReadAccess: false,
    versioned: false,
    // Development default: the bucket can be destroyed after it is emptied.
    // Production default: change to RemovalPolicy.RETAIN to prevent accidental data loss.
    removalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: false,
  });
}
