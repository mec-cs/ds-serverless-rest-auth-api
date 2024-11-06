// GET method to a user, parameter -> ?username=..

import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {
        console.log("[EVENT]", JSON.stringify(event));

        // path : /profile?username=..
        const queryParams = event.queryStringParameters;
        const username = queryParams?.username;

        if (!username) {
            return {
                statusCode: 400,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ message: "username is required to search a profile!" }),
            };
        }

        let commandInput: QueryCommandInput = {
            TableName: process.env.USER_TABLE_NAME,
            IndexName: "UsernameIndex",
            KeyConditionExpression: "username = :username",
            ExpressionAttributeValues: { ":username": username, },
            Limit: 1,
        };

        const commandOutput = await ddbDocClient.send(
            new QueryCommand(commandInput)
        );

        if (!commandOutput.Items || commandOutput.Items.length === 0) {
            return {
                statusCode: 404,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ message: "Profile with specified username is not found!" }),
            };
        }

        // expected successfull response return, it will return first user with that username
        // a bad design initially, later on it must be handled and restructured
        // usernames can also be unique and part of primary key in the Users table
        return {
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ data: commandOutput.Items[0] }),
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
