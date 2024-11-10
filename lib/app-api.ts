import { Aws } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as node from "aws-cdk-lib/aws-lambda-nodejs";
import * as custom from "aws-cdk-lib/custom-resources";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { generateBatch } from "../lambda/common/utils";
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

        usersTable.addGlobalSecondaryIndex({
            indexName: "EmailIndex",
            partitionKey: { name: "email", type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL
        });

        const translateTable = new dynamodb.Table(this, "TranslateTable", {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: "gameId", type: dynamodb.AttributeType.STRING },
            sortKey: { name: "targetLanguage", type: dynamodb.AttributeType.STRING },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            tableName: "Translations",
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
                GAME_TABLE_NAME: gamesTable.tableName,
                USER_TABLE_NAME: usersTable.tableName,
                TRANSLATE_TABLE_NAME: translateTable.tableName,
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
                        [gamesTable.tableName ?? "Games"]: generateBatch(games),
                        [usersTable.tableName ?? "Users"]: generateBatch(users),
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

        const deleteGameFn = new node.NodejsFunction(this, "DeleteGameFn", {
            ...appCommonFnProps,
            entry: "./lambda/service/deleteGame.ts",
        });

        const translateFn = new node.NodejsFunction(this, "TranslateGameFn", {
            ...appCommonFnProps,
            entry: "./lambda/function/translate.ts",
        });

        // lambda functions for profile
        const getUserProfileFn = new node.NodejsFunction(this, "GetUserProfileFn", {
            ...appCommonFnProps,
            entry: "./lambda/profile/getUser.ts",
        });

        const deleteUserFn = new node.NodejsFunction(this, "DeleteUserFn", {
            ...appCommonFnProps,
            entry: "./lambda/profile/deleteUser.ts",
        });

        const addUserFn = new node.NodejsFunction(this, "AddUserFn", {
            ...appCommonFnProps,
            entry: "./lambda/profile/addUser.ts",
        });


        // table accesses
        gamesTable.grantFullAccess(getGamesFn);
        gamesTable.grantFullAccess(getGameByFilter);
        gamesTable.grantFullAccess(addGameFn);
        gamesTable.grantFullAccess(translateFn);
        gamesTable.grantFullAccess(updateGameFn);
        gamesTable.grantFullAccess(deleteUserFn);
        gamesTable.grantFullAccess(deleteGameFn);

        usersTable.grantFullAccess(getUserProfileFn);
        usersTable.grantFullAccess(deleteUserFn);
        usersTable.grantFullAccess(addUserFn);
        usersTable.grantFullAccess(addGameFn);
        usersTable.grantFullAccess(deleteGameFn);
        usersTable.grantFullAccess(updateGameFn);

        translateTable.grantFullAccess(translateFn);


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

        // DELETE to a specific game
        userGamesResource.addMethod("DELETE", new apig.LambdaIntegration(deleteGameFn), {
            authorizer: requestAuthorizer,
            authorizationType: apig.AuthorizationType.CUSTOM,
        });

        // GET translation of a game, protected to the authorized users
        translationResource.addMethod("GET", new apig.LambdaIntegration(translateFn));

        // DELETE request to delete profile and its associated games
        profileResource.addMethod("DELETE", new apig.LambdaIntegration(deleteUserFn), {
            authorizer: requestAuthorizer,
            authorizationType: apig.AuthorizationType.CUSTOM,
        });

        // POST request to add new user profile
        profileResource.addMethod("POST", new apig.LambdaIntegration(addUserFn), {
            authorizer: requestAuthorizer,
            authorizationType: apig.AuthorizationType.CUSTOM,
        });

    }
}