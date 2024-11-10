// PUT with protected action, authorized users can operate

import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { CookieMap, JwtToken, parseCookies, verifyToken, } from "../common/utils";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand, } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Game, UserProfile } from "../../shared/types";
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
        const updatedGameData = JSON.parse(event.body || "{}");

        if (!userId || !gameId) {
            return apiResponses._400({ message: "Missing IDs in the parameter!" });
        }

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
            return apiResponses._403({ message: "You are not authorized to update this game!" });
        }

        // to check whether a game item existing with give IDs
        const gameItemCommandOutput = await ddbDocClient.send(
            new GetCommand({
                TableName: process.env.GAME_TABLE_NAME,
                Key: { userId, gameId },
            })
        );

        if (!gameItemCommandOutput.Item) {
            return apiResponses._404({ message: "No game found with the given ID" });
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

        return apiResponses._200({
            gameId: gameId,
            updaterEmail: verifiedJwt.email,
            message: "Game updated successfully"
        });

    } catch (error: any) {
        console.log("[ERROR]", JSON.stringify(error));
        return apiResponses._500({ error });
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