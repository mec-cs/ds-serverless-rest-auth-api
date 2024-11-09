import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { SignInBody } from "../../shared/types";
import {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
    InitiateAuthCommandInput,
} from "@aws-sdk/client-cognito-identity-provider";
import Ajv from "ajv";
import schema from "../../shared/types.schema.json";
import apiResponses from '../common/apiResponses';

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["SignInBody"] || {});

const client = new CognitoIdentityProviderClient({
    region: process.env.REGION,
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log("[EVENT]", JSON.stringify(event));
        const body = event.body ? JSON.parse(event.body) : undefined;

        if (!isValidBodyParams(body)) {
            console.log("[Invalid]", body);

            return apiResponses._500({
                message: `Incorrect type. Must match SignInBody schema`,
                schema: schema.definitions["SignInBody"],
            });
        }

        const signInBody = body as SignInBody;

        const params: InitiateAuthCommandInput = {
            ClientId: process.env.CLIENT_ID!,
            AuthFlow: "USER_PASSWORD_AUTH",
            AuthParameters: {
                USERNAME: signInBody.username,
                PASSWORD: signInBody.password,
            },
        };

        const command = new InitiateAuthCommand(params);
        const { AuthenticationResult } = await client.send(command);
        console.log("Auth", AuthenticationResult);
        if (!AuthenticationResult) {
            return apiResponses._400({ message: "User signin failed" })
        }

        const token = AuthenticationResult.IdToken;

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Set-Cookie": `token=${token}; SameSite=None; Secure; HttpOnly; Path=/; Max-Age=3600;`,
            },
            body: JSON.stringify({
                message: "Auth successfull",
                token: token,
            }),
        };
    } catch (err) {
        console.error(err);
        return apiResponses._500({ message: err });
    }
};