// GET with public access, every user can query all games

import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import apiResponses from '../common/apiResponses';

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {     // Note change
    try {
        console.log("[EVENT]", JSON.stringify(event));

        const parameters = event?.pathParameters;
        const userId = parameters?.userId;

        if (!userId) {
            return apiResponses._400({ message: "a game ID is required to find!" });
        }

        // genre=action , filter=[gt, lt, et] --> greater than, less than, equal to
        const queryParams = event?.queryStringParameters || {};
        const genre = queryParams.genre;
        const popularity = queryParams.popularity;
        const filter = queryParams.filter;

        let filterExpression = "";
        let expressionAttributeValues: any = { ":userId": userId };
        const keyConditionExpression = "userId = :userId";


        if (genre) {
            filterExpression += "genre = :genre";
            expressionAttributeValues[":genre"] = genre;
        }

        if (popularity && filter) {
            const pop = parseInt(popularity);

            if (isNaN(pop)) {
                return apiResponses._400({ message: "Invalid popularity data, it must be number!" });
            }

            if (filterExpression) {
                filterExpression += " AND ";
            }

            switch (filter) {
                case "gt":
                    filterExpression += "popularity > :popularity";
                    break;
                case "lt":
                    filterExpression += "popularity < :popularity";
                    break;
                case "et":
                    filterExpression += "popularity = :popularity";
                    break;
                default:
                    return apiResponses._400({ message: "Invalid filter parameter, ['gt','lt','et']" });
            }

            expressionAttributeValues[":popularity"] = pop;
        }

        const getFilteredCommandOutput = await ddbDocClient.send(
            new QueryCommand({
                TableName: process.env.GAME_TABLE_NAME,
                KeyConditionExpression: keyConditionExpression,
                FilterExpression: filterExpression || undefined,
                ExpressionAttributeValues: expressionAttributeValues,
            })
        );

        if (!getFilteredCommandOutput.Items) {
            return apiResponses._404({ message: "A game with parameters is not found!" });
        }

        const body = {
            data: getFilteredCommandOutput.Items,
        };

        console.log("[SCAN ITEM]", JSON.stringify(body));

        // expected successfull response return
        return apiResponses._200({ body });

    } catch (error: any) {
        console.log("[ERROR]", JSON.stringify(error));
        return apiResponses._500({ error });
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
