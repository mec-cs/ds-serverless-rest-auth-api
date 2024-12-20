// DELETE request with protected access, authorized users can delete a game

import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
    CookieMap,
    JwtToken,
    parseCookies,
    verifyToken,
} from "../common/utils";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
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

        const userId = event.pathParameters?.userId;
        const gameId = event.queryStringParameters?.gameId;

        if (!userId || !gameId) {
            return apiResponses._400({ message: "Missing IDs in the parameter!" });
        }

        // first sending a query to DB to check existence of the game
        const gameItemCommandOutput = await ddbDocClient.send(
            new GetCommand({
                TableName: process.env.GAME_TABLE_NAME,
                Key: { userId, gameId },
            })
        );

        if (!gameItemCommandOutput.Item) {
            return apiResponses._400({ message: "No game found with these IDs of user and game." });
        }

        // then sending a query to DB to check owner of the game and authorized user
        const userItemCommandOutput = await ddbDocClient.send(
            new GetCommand({
                TableName: process.env.USER_TABLE_NAME,
                Key: { userId },
            })
        );

        if (!userItemCommandOutput.Item) {
            return apiResponses._404({ message: "No user found with the ID of ", userId });
        }

        // to check if current authenticated user is the owner of the game item        
        const gameOwnerUser: UserProfile = userItemCommandOutput.Item as UserProfile;

        if (gameOwnerUser.email !== verifiedJwt.email) {
            return apiResponses._403({ message: "You are not authorized to delete this game!" });
        }

        // if game exists, delete the game
        const deleteCommandOutput = await ddbDocClient.send(
            new DeleteCommand({
                TableName: process.env.GAME_TABLE_NAME,
                Key: { userId, gameId },
            })
        );

        console.log("Delete Command Response:", deleteCommandOutput.$metadata.httpStatusCode?.toString, "GameID: ", gameId, " and UserID:", userId, " is deleted!");
        console.log("[DELETE ITEM]", JSON.stringify(gameId));

        return apiResponses._200({
            gameId: gameId,
            message: "Game is deleted successfully!"
        });

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