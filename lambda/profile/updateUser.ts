// PUT method to a user to update its values, body includes necessary data 

import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { CookieMap, JwtToken, parseCookies, verifyToken, } from "../common/utils";
import { DynamoDBDocumentClient, UpdateCommand, } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { UserProfile } from "../../shared/types";
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

        const userId = event?.queryStringParameters?.userId || {};
        const updatedProfileData = JSON.parse(event.body || "{}");

        if (!userId) {
            return apiResponses._400({ message: "Missing user ID parameter!" });
        }

        if (!updatedProfileData) {
            return apiResponses._400({ message: "Fields are provided for update!" });
        }

        const commandOutput = await ddbDocClient.send(
            new UpdateCommand({
                TableName: process.env.USER_TABLE_NAME,
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
        console.log("[UPDATE ITEM]", JSON.stringify(userId));

        return apiResponses._200({
            userId: userId,
            message: "User profile updated successfully"
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