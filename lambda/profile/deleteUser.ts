// DELETE request with protected access, authorized users can delete an user

import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
    CookieMap,
    JwtToken,
    parseCookies,
    verifyToken,
} from "../common/utils";

import { DeleteItemCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { UserProfile } from "../../shared/types";
import apiResponses from '../common/apiResponses';

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event: any) => {
    try {
        console.log("[EVENT]", JSON.stringify(event));

        const cookies: CookieMap = parseCookies(event);

        if (!cookies) {
            return apiResponses._401({ message: "Unauthorized request, missing cookie!" });
        }

        const verifiedJwt: JwtToken = await verifyToken(
            cookies.token,
            process.env.USER_POOL_ID,
            process.env.REGION!
        );

        console.log(JSON.stringify(verifiedJwt));

        if (!verifiedJwt) {
            return apiResponses._401({ message: "JWT has failed, sign again!" });
        }

        const userId = event?.queryStringParameters?.userId || {};

        if (!userId) {
            return apiResponses._400({ message: "Missing user ID parameter!" })
        }

        // check if user exists
        const userCommandOutput = await ddbDocClient.send(
            new GetCommand({
                TableName: process.env.USER_TABLE_NAME,
                Key: { userId },
            })
        );

        if (!userCommandOutput.Item) {
            return apiResponses._400({ message: "User not found with the ID of", userId })
        }

        // to check if current authenticated user is the owner of the user item        
        const userToDelete: UserProfile = userCommandOutput.Item as UserProfile;

        if (userToDelete.email !== verifiedJwt.email) {
            return apiResponses._403({ message: "You are not authorized to delete this user!" });
        }


        // In SQL, the DELETE statement removes one or more rows from a table.
        // Amazon DynamoDB uses the DeleteItem operation to delete one item at a time. 
        // Thats why we need to query user games and iterate each of items to delete.

        // logic will be querying the games associated with that user, then deleting all

        const usergamesQueryOutput = await ddbDocClient.send(
            new QueryCommand({
                TableName: process.env.GAME_TABLE_NAME,
                KeyConditionExpression: "userId = :userId",
                ExpressionAttributeValues: { ":userId": userId },
            })
        );

        // if user does not have any games just delete it and return successfull response
        if (!usergamesQueryOutput.Items) {
            const onlyUserDeleteCommand = await ddbDocClient.send(
                new DeleteCommand({
                    TableName: process.env.USER_TABLE_NAME,
                    Key: { userId },
                })
            )

            console.log("Only user with ID of", userId, " is deleted, \nResponse Code:", onlyUserDeleteCommand.$metadata.httpStatusCode)

            return apiResponses._200({
                userId: userId,
                message: "User without any game is deleted successfully!"
            })
        }

        const usergames = usergamesQueryOutput.Items

        // deleting each of the game associated with the given user
        for (let game of usergames) {
            await ddbDocClient.send(
                new DeleteCommand({
                    TableName: process.env.GAME_TABLE_NAME,
                    Key: {
                        userId: game.userId,
                        gameId: game.gameId,
                    }
                })
            );
        }

        // deleting the usergames owner user at the end, (deleting order is important)
        const gameOwnerUserDeleteCommand = await ddbDocClient.send(
            new DeleteCommand({
                TableName: process.env.USER_TABLE_NAME,
                Key: { userId },
            })
        );

        console.log("User with ID of", userId, " is deleted.\nGames: ", usergames, "\nResponse Code:", gameOwnerUserDeleteCommand.$metadata.httpStatusCode);
        console.log("[DELETE ITEM]", JSON.stringify(userId));

        return apiResponses._200({
            userId: userId,
            message: "User with its games are deleted successfully!"
        })

    } catch (error: any) {
        console.log("[ERROR]", JSON.stringify(error));
        return apiResponses._500({ error })
    }
}

function createDDbDocClient() {
    const ddbClient = new DynamoDBClient({ region: process.env.REGION });
    const marshallOptions = {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
    };
    const unmarshallOptions = {
        wrapNumbers: false,
    };
    const translateConfig = { marshallOptions, unmarshallOptions };
    return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}