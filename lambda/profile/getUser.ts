// GET method to a user, parameter -> ?username=..

import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import apiResponses from '../common/apiResponses';

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {
        console.log("[EVENT]", JSON.stringify(event));

        // path : /profile?username=..
        const queryParams = event.queryStringParameters;
        const username = queryParams?.username;

        if (!username) {
            return apiResponses._400({ message: "username is required to search a profile!" })
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
            return apiResponses._404({ message: "Profile with specified username is not found!" })
        }

        console.log("[SCAN ITEM]", JSON.stringify(commandOutput.Items));

        // expected successfull response return, it will return first user with that username
        // a bad design initially, later on it must be handled and restructured
        // usernames can also be unique and part of primary key in the Users table

        return apiResponses._200({ data: commandOutput.Items[0] })

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
