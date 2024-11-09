// POST with protected access, authorized users can create their users

import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
    CookieMap,
    JwtToken,
    parseCookies,
    verifyToken,
} from "../common/utils";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { Game } from "../../shared/types";
import Ajv from "ajv";
import schema from "../../shared/types.schema.json";
import apiResponses from '../common/apiResponses';

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["UserProfileParams"] || {});

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
            return apiResponses._400({ message: "JWT has failed, sign again!" })
        }

        const body = event.body ? JSON.parse(event.body) : undefined;

        if (!body) {
            return apiResponses._400({ message: "Invalid data, missing values must be given!" });
        }

        if (!isValidBodyParams(body)) {
            return apiResponses._500({
                message: `Incorrect type. Must match the schema`,
                schema: schema.definitions["UserProfileParams"],
            });
        }

        const getUserByEmailCommand = await ddbDocClient.send(
            new QueryCommand({
                TableName: "Users",
                IndexName: "EmailIndex",
                KeyConditionExpression: "#email = :emailValue",
                ExpressionAttributeNames: {
                    "#email": "email",
                },
                ExpressionAttributeValues: {
                    ":emailValue": verifiedJwt.email,
                },
                Limit: 1
            })
        );

        if (getUserByEmailCommand.Items && getUserByEmailCommand.Items.length !== 0) {
            return apiResponses._404({ message: "You already have a user account!" });
        }

        body["email"] = verifiedJwt.email;

        const createNewUserCommand = await ddbDocClient.send(
            new PutCommand({
                TableName: process.env.USER_TABLE_NAME,
                Item: body,
            })
        );

        return apiResponses._200({
            message: "New user is created!",
            status: createNewUserCommand.$metadata.httpStatusCode,
            user: body
        });

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