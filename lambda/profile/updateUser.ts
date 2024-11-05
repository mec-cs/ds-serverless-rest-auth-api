// PUT method to a user to update its values, body includes necessary data 

import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { CookieMap, JwtToken, parseCookies, verifyToken, } from "../utils";
import { DynamoDBDocumentClient, UpdateCommand, } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { UserProfile } from "../../shared/types";

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

        const userId = event?.queryStringParameters?.userId || {};
        const updatedProfileData = JSON.parse(event.body || "{}");

        if (!userId) {
            return {
                statusCode: 400,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ message: "Missing user ID parameter!" }),
            };
        }

        if (!updatedProfileData) {
            return {
                statusCode: 400,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ message: "Fields are provided for update!" }),
            };
        }

        const commandOutput = await ddbDocClient.send(
            new UpdateCommand({
                TableName: process.env.TABLE_NAME,
                Key: { userId: userId },
                UpdateExpression: `
                    set #username = :username,
                        #name = :name,
                        #email = :email,
                        #joinedDate = :joinedDate,
                        #favoriteGenres = :favoriteGenres
                `,
                ExpressionAttributeNames: {
                    "#username": "username",
                    "#name": "name",
                    "#email": "email",
                    "#joinedDate": "joinedDate",
                    "#favoriteGenres": "favoriteGenres",
                },
                ExpressionAttributeValues: {
                    ":username": updatedProfileData.username,
                    ":name": updatedProfileData.name,
                    ":email": updatedProfileData.email,
                    ":joinedDate": updatedProfileData.joinedDate,
                    ":favoriteGenres": updatedProfileData.favoriteGenres,
                },
            })
        );

        // to check updated game data
        console.log("Updated profile: ", JSON.stringify(updatedProfileData));

        return {
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                profile: userId,
                message: "User profile updated successfully"
            }),
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