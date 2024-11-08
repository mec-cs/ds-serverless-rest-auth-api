// PUT with protected action, authorized users can operate

import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { CookieMap, JwtToken, parseCookies, verifyToken, } from "../utils";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand, } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Game } from "../../shared/types";

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
        const updatedGameData = JSON.parse(event.body || "{}");

        if (!userId || !gameId) {
            return {
                statusCode: 400,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ message: "Missing IDs in the parameter!" }),
            };
        }

        // to check whether a game item existing with give IDs
        const gameItemCommandOutput = await ddbDocClient.send(
            new GetCommand({
                TableName: process.env.GAME_TABLE_NAME,
                Key: { userId, gameId },
            })
        );

        if (!gameItemCommandOutput.Item) {
            return {
                statusCode: 404,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ message: "No game found with the given IDs!" }),
            };
        }

        const updateCommandOutput = await ddbDocClient.send(
            new UpdateCommand({
                TableName: process.env.GAME_TABLE_NAME,
                Key: { userId, gameId },
                UpdateExpression: `
                set #title = :title, 
                    #genre = :genre, 
                    #releaseYear = :releaseYear,
                    #description = :description,
                    #platform = :platform,
                    #popularity = :popularity
            `,
                ExpressionAttributeNames: {
                    "#title": "title",
                    "#genre": "genre",
                    "#releaseYear": "releaseYear",
                    "#description": "description",
                    "#platform": "platform",
                    "#popularity": "popularity",
                },
                ExpressionAttributeValues: {
                    ":title": updatedGameData.title,
                    ":genre": updatedGameData.genre,
                    ":releaseYear": updatedGameData.releaseYear,
                    ":description": updatedGameData.description,
                    ":platform": updatedGameData.platform,
                    ":popularity": updatedGameData.popularity,
                },
            })
        );

        // to check updated game data
        console.log("Updated profile: ", JSON.stringify(updatedGameData));
        console.log("[UPDATE ITEM]", JSON.stringify(gameId));

        return {
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(
                {
                    gameId: gameId,
                    message: "Game updated successfully"
                }
            ),
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