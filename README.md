# Serverless REST API with AWS CDK

This project demonstrates the use of AWS serverless services to create a REST API for managing video game items and its provider users in DynamoDB tables. Built using the AWS Cloud Development Kit (CDK), the application includes endpoints for adding, updating, retrieving, and deleting data. Featuring API Gateway, it uses DynamoDB, Cognito for authentication, Amazon SES for email, Amazon Translate, and CloudWatch for logging. Key features include:

#### CRUD operations
#### Data storage
#### Authentication & Authorization
#### Translation (coming soon)

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
