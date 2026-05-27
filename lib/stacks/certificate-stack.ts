import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

export interface CertificateStackProps extends StackProps {
  projectName: string;
  domainName: string;
  alternateDomainNames: string[];
}

export class CertificateStack extends Stack {
  public readonly certificateArn: string;

  constructor(scope: Construct, id: string, props: CertificateStackProps) {
    super(scope, id, props);

    if (Stack.of(this).region !== 'us-east-1') {
      throw new Error('CloudFront requires the ACM certificate to be created in us-east-1.');
    }

    const certificate = new acm.Certificate(this, 'SiteCertificate', {
      domainName: props.domainName,
      subjectAlternativeNames: props.alternateDomainNames,
      validation: acm.CertificateValidation.fromDns(),
    });

    this.certificateArn = certificate.certificateArn;

    new CfnOutput(this, 'CertificateArn', {
      value: certificate.certificateArn,
      description: 'ACM certificate ARN. Create the DNS validation CNAME records in Cloudflare while this stack is deploying.',
    });

    new CfnOutput(this, 'CertificateRegion', {
      value: Stack.of(this).region,
      description: 'CloudFront certificates must be issued in us-east-1.',
    });
  }
}
