# Video Games REST API - Serverless Application (AWS CDK)

## Overview 
This project is a serverless REST API developed using the AWS Cloud Development Kit (CDK). The application allows users to manage a video games database where they can add, update, delete, and retrieve game data. The API leverages Amazon Cognito for user authentication, IAM for authorization, AWS Lambda for backend processing, API Gateway to manage HTTP requests, Amazon DynamoDB for data storage, and Amazon Translate to support multilingual functionality.

## Features
* AWS Serverless Infrastructure
* User Authentication with Amazon Cognito & Cookie-based:
* Authorization
* Amazon Translate
* CRUD operations

## DynamoDB tables
1. Users Table: User profile information is stored.
2. Games Table:  Stores details of each game.
3. Translations Table: Stores translated text for game attributes to reduce redundant translation requests.

## Endpoints
### Games Endpoints
#### GET /games
Retrieves all games in the database.
(all user access)

#### GET /games/{userId}?popularity=...&filter=...&genre=...
Retrieves games based on specific query parameters like user, genre, and popularity.
(all user access)

#### POST /games
Allows an authenticated user to create a new game.
(authenticated user access)

#### PUT /games/{userId}?gameId=...
Allows authenticated users to update a game they created.
(authenticated user access)

#### DELETE /games/{userId}?gameId=...
Allows an authenticated user to delete a game they created.
(authenticated user access)

### Profile Endpoints
##### GET /profile?username=...
Retrieves profile information for a specified username.
(all user access)

#### POST /profile
Allows a user to create a profile in the system.
(authenticated user access)

#### DELETE /profile?userId=...
Allows an authenticated user to delete their profile.
(authenticated user access)

### Translate Endpoint
#### GET /games/{userId}/{gameId}/translation?language=...
Translates the genre, title, and description of a specified game to a target language and returns it.
(all user access)

## Setup and Deployment
1. Clone the repository
git clone "url"
cd "url-repo-name"
2. npm install
3. cdk deploy

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
