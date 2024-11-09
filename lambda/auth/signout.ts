import { APIGatewayProxyResult } from "aws-lambda";
import apiResponses from '../common/apiResponses';

exports.handler = async function (): Promise<APIGatewayProxyResult> {
    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Origin": "*",
            "Set-Cookie":
                "token=x; SameSite=None; Secure; HttpOnly; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;",
        },
        body: JSON.stringify({
            message: "Signout successfull",
        }),
    };
};