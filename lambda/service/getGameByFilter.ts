// GET with public access, every user can query all games

import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {     // Note change
    try {
        console.log("[EVENT]", JSON.stringify(event));

        const parameters = event?.pathParameters;
        const userId = parameters?.userId;

        if (!userId) {
            return {
                statusCode: 400,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ message: "a game ID is required to find!" }),
            };
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
                return {
                    statusCode: 400,
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ message: "Invalid popularity data, it must be number!" }),
                };
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
                    return {
                        statusCode: 400,
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ message: "Invalid filter parameter, ['gt','lt','et']" }),
                    };
            }

            expressionAttributeValues[":popularity"] = pop;
        }

        const commandOutput = await ddbDocClient.send(
            new QueryCommand({
                TableName: process.env.GAMES_TABLE,
                KeyConditionExpression: keyConditionExpression,
                FilterExpression: filterExpression || undefined,
                ExpressionAttributeValues: expressionAttributeValues,
            })
        );

        console.log("QueryCommand response: ", commandOutput);


        if (!commandOutput.Items) {
            return {
                statusCode: 404,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ message: "A game with parameters is not found!" }),
            };
        }

        const body = {
            data: commandOutput.Items,
        };

        // expected successfull response return
        return {
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ body }),
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
