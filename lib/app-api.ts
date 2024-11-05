import { Aws } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as node from "aws-cdk-lib/aws-lambda-nodejs";
import * as custom from "aws-cdk-lib/custom-resources";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { generateBatch } from "../lambda/utils";
import { games, users } from "../seed/games"

type AppApiProps = {
    userPoolId: string;
    userPoolClientId: string;
};

export class AppApi extends Construct {
    constructor(scope: Construct, id: string, props: AppApiProps) {
        super(scope, id);

        // Tables 
        const gamesTable = new dynamodb.Table(this, "GamesTable", {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
            sortKey: { name: "gameId", type: dynamodb.AttributeType.STRING },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            tableName: "Games",
        });

        gamesTable.addGlobalSecondaryIndex({
            indexName: "GameIdIndex",
            partitionKey: { name: "gameId", type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });

        const usersTable = new dynamodb.Table(this, "UsersTable", {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            tableName: "Users",
        });

        usersTable.addGlobalSecondaryIndex({
            indexName: "UsernameIndex",
            partitionKey: { name: "username", type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });


        const appApi = new apig.RestApi(this, "AppApi", {
            description: "App RestApi",
            endpointTypes: [apig.EndpointType.REGIONAL],
            defaultCorsPreflightOptions: {
                allowOrigins: apig.Cors.ALL_ORIGINS,
            },
        });

        const appCommonFnProps = {
            architecture: lambda.Architecture.ARM_64,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            runtime: lambda.Runtime.NODEJS_LATEST, // NODEJS_16_X is deprecated
            handler: "handler",
            environment: {
                USER_POOL_ID: props.userPoolId,
                CLIENT_ID: props.userPoolClientId,
                REGION: cdk.Aws.REGION,
            },
        };


        new custom.AwsCustomResource(this, "gamesddbInitData", {
            onCreate: {
                service: "DynamoDB",
                action: "batchWriteItem",
                parameters: {
                    RequestItems: {
                        [gamesTable.tableName]: generateBatch(games),
                        [usersTable.tableName]: generateBatch(users),
                    },
                },
                physicalResourceId: custom.PhysicalResourceId.of("gamesddbInitData"),
            },
            policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
                resources: [gamesTable.tableArn, usersTable.tableArn],
            }),
        });


        // authorizers
        const authorizerFn = new node.NodejsFunction(this, "AuthorizerFn", {
            ...appCommonFnProps,
            entry: "./lambda/auth/authorizer.ts",
        });
        const requestAuthorizer = new apig.RequestAuthorizer(
            this,
            "RequestAuthorizer",
            {
                identitySources: [apig.IdentitySource.header("cookie")],
                handler: authorizerFn,
                resultsCacheTtl: cdk.Duration.minutes(0),
            }
        );


        // lambda functions for game
        const getGamesFn = new node.NodejsFunction(this, "GetGamesFn", {
            ...appCommonFnProps,
            entry: "./lambda/service/getGames.ts",
        });

        const getGameByFilter = new node.NodejsFunction(this, "getGameByFilter", {
            ...appCommonFnProps,
            entry: "./lambda/service/getGameByFilter.ts",
        });

        const addGameFn = new node.NodejsFunction(this, "AddGameFn", {
            ...appCommonFnProps,
            entry: "./lambda/service/addGame.ts",
        });

        const updateGameFn = new node.NodejsFunction(this, "UpdateGameFn", {
            ...appCommonFnProps,
            entry: "./lambda/service/updateGame.ts",
        });

        const translateGameFn = new node.NodejsFunction(this, "TranslateGameFn", {
            ...appCommonFnProps,
            entry: "./lambda/service/translateGame.ts",
        });

        // lambda functions for profile
        const getUserProfileFn = new node.NodejsFunction(this, "GetUserProfileFn", {
            ...appCommonFnProps,
            entry: "./lambda/profile/getUser.ts",
        });

        const updateUserProfileFn = new node.NodejsFunction(this, "UpdateUserProfileFn", {
            ...appCommonFnProps,
            entry: "./lambda/profile/updateUser.ts",
        });


        // api endpoints
        // game : /games
        // user : /profile
        const gamesResource = appApi.root.addResource("games");
        const userGamesResource = gamesResource.addResource("{userId}");

        const gameIdResource = userGamesResource.addResource('{gameId}');
        const translationResource = gameIdResource.addResource('translation');

        const profileResource = appApi.root.addResource("profile");

        //
        // unauthorized accessible methods for /game and /profile endpoint
        //

        // GET all games
        gamesResource.addMethod("GET", new apig.LambdaIntegration(getGamesFn));

        // GET to a specific game
        userGamesResource.addMethod("GET", new apig.LambdaIntegration(getGameByFilter));

        // GET to a specific user, parameter is username
        profileResource.addMethod("GET", new apig.LambdaIntegration(getUserProfileFn));

        //
        // authorized accessible methods for /game and /profile endpoint
        //

        // POST to add a new game
        gamesResource.addMethod("POST", new apig.LambdaIntegration(addGameFn), {
            authorizer: requestAuthorizer,
            authorizationType: apig.AuthorizationType.CUSTOM,
        });

        // PUT to update game by parameters of user id and game id
        userGamesResource.addMethod("PUT", new apig.LambdaIntegration(updateGameFn), {
            authorizer: requestAuthorizer,
            authorizationType: apig.AuthorizationType.CUSTOM,
        });

        // GET translation of a game, protected to the authorized users
        translationResource.addMethod("GET", new apig.LambdaIntegration(translateGameFn), {
            authorizer: requestAuthorizer,
            authorizationType: apig.AuthorizationType.CUSTOM,
        });

        // PUT request to update profile
        profileResource.addResource("{userId}").addMethod("PUT", new apig.LambdaIntegration(updateUserProfileFn), {
            authorizer: requestAuthorizer,
            authorizationType: apig.AuthorizationType.CUSTOM,
        });

    }
}