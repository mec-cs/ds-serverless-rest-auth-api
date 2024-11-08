// DELETE request with protected access, authorized users can delete a game

import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
    CookieMap,
    JwtToken,
    parseCookies,
    verifyToken,
} from "../utils";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event: any) => {
    try {
        console.log("[EVENT]", JSON.stringify(event));

        const cookies: CookieMap = parseCookies(event);

        if (!cookies) {
            return {
                statusCode: 401,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "Unauthorized request, missing cookie!" }),
            };
        }

        const verifiedJwt: JwtToken = await verifyToken(
            cookies.token,
            process.env.USER_POOL_ID,
            process.env.REGION!
        );

        console.log(JSON.stringify(verifiedJwt));

        if (!verifiedJwt) {
            return {
                statusCode: 401,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "JWT has failed, sign again!" }),
            }
        }

        const userId = event.pathParameters?.userId;
        const gameId = event.queryStringParameters?.gameId;

        if (!userId || !gameId) {
            return {
                statusCode: 400,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ message: "Missing IDs in the parameter!" }),
            };
        }

        // first sending a query to DB to check existence of the game
        const getCommandOutput = await ddbDocClient.send(
            new GetCommand({
                TableName: process.env.GAME_TABLE_NAME,
                Key: { userId, gameId },
            })
        );

        if (!getCommandOutput.Item) {
            return {
                statusCode: 400,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ message: "Game not found for these IDs of user and game." }),
            };
        }

        // then if game exists, delete the game
        const deleteCommandOutput = await ddbDocClient.send(
            new DeleteCommand({
                TableName: process.env.GAME_TABLE_NAME,
                Key: { userId, gameId },
            })
        );

        console.log("Delete Command Response:", deleteCommandOutput.$metadata.httpStatusCode?.toString, "GameID: ", gameId, " and UserID:", userId, " is deleted!");
        console.log("[DELETE ITEM]", JSON.stringify(gameId));

        return {
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ gameId: gameId, message: "Game is deleted successfully!" }),
        };

    } catch (error: any) {
        console.log("[ERROR]", JSON.stringify(error));
        return {
            statusCode: 500,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ error }),
        };
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