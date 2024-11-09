import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
    CognitoIdentityProviderClient,
    ConfirmSignUpCommand,
    ConfirmSignUpCommandInput,
} from "@aws-sdk/client-cognito-identity-provider";
import { ConfirmSignUpBody } from "../../shared/types";

import Ajv from "ajv";
import schema from "../../shared/types.schema.json";
import apiResponses from '../common/apiResponses';

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(
    schema.definitions["ConfirmSignUpBody"] || {}
);

const client = new CognitoIdentityProviderClient({ region: process.env.REGION });

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log("[EVENT]", JSON.stringify(event));
        const body = event.body ? JSON.parse(event.body) : undefined;

        if (!isValidBodyParams(body)) {
            return apiResponses._500({
                message: `Incorrect type. Must match ConfirmSignUpBody schema`,
                schema: schema.definitions["ConfirmSignUpBody"],
            })
        }

        const confirmSignUpBody = body as ConfirmSignUpBody;

        const params: ConfirmSignUpCommandInput = {
            ClientId: process.env.CLIENT_ID!,
            Username: confirmSignUpBody.username,
            ConfirmationCode: confirmSignUpBody.code,
        };

        const command = new ConfirmSignUpCommand(params);
        await client.send(command);

        return apiResponses._200({
            message: `User ${confirmSignUpBody.username} successfully confirmed`,
            confirmed: true,
        })
    } catch (err) {
        return apiResponses._500({ message: err })
    }
};