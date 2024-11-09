// POST with protected access, authorized users can create new games

import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
    CookieMap,
    JwtToken,
    parseCookies,
    verifyToken,
} from "../common/utils";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { Game } from "../../shared/types";
import Ajv from "ajv";
import schema from "../../shared/types.schema.json";
import apiResponses from '../common/apiResponses';

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["Game"] || {});

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

        const insertCommandOutput = await ddbDocClient.send(
            new PutCommand({
                TableName: process.env.GAME_TABLE_NAME,
                Item: body,
            })
        );

        console.log("[INSERT ITEM]", JSON.stringify(body));

        return apiResponses._201({
            message: "Game added successfully!",
            data: body
        })

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