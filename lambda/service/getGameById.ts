// GET with public access, every user can query all games

import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {     // Note change
    try {
        console.log("[EVENT]", JSON.stringify(event));

        const parameters = event?.pathParameters;
        const gameId = parameters?.gameId;

        if (!gameId) {
            return {
                statusCode: 400,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ message: "a game ID is required to find!" }),
            };
        }

        const commandOutput = await ddbDocClient.send(
            new QueryCommand({
                TableName: process.env.GAMES_TABLE,
                IndexName: "GameIdIndex",
                KeyConditionExpression: "gameId = :gameId",
                ExpressionAttributeValues: { ":gameId": gameId },
            })
        );

        console.log("GetCommand response: ", commandOutput);

        // if any game is not found with given id in params
        if (!commandOutput.Items) {
            return {
                statusCode: 404,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ message: "a game with give id is not found!" }),
            };
        }

        const body = {
            data: commandOutput.Items,
        };

        // expected successfull response return - HTTP 200
        return {
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ data: commandOutput.Items }),
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
};

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
