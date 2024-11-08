// GET request with public access

import { Table } from "aws-cdk-lib/aws-dynamodb";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {
        console.log("Event: ", event);

        const getCommandOutput = await ddbClient.send(
            new ScanCommand({
                TableName: process.env.GAME_TABLE_NAME,
            })
        );

        if (!getCommandOutput.Items) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ Message: "Invalid operation!" }),
            };
        }

        const body = {
            data: getCommandOutput.Items,
        };

        console.log("[SCAN ITEM]", JSON.stringify(body));

        // expected return response
        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(body),
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
