import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import 'source-map-support/register';
import apiResponses from '../common/apiResponses';
import * as AWS from 'aws-sdk';
import { Game, Translation } from "../../shared/types";
import { describe } from 'node:test';

const translate = new AWS.Translate();
const ddbDocClient = createDDbDocClient();

const LanguageMap = {
    "English": "en",
    "French": "fr",
    "Spanish": "es",
    "German": "de",
};

export const handler: APIGatewayProxyHandler = async (event) => {

    const { userId, gameId } = event.pathParameters || {};
    const language = event.queryStringParameters?.language;

    if (!userId || !gameId) {
        return apiResponses._400({ message: "Missing ID parameter." });
    }

    if (!language) {
        return apiResponses._400({ message: "Missing language from the body" });
    }

    if (!(language in LanguageMap)) {
        return apiResponses._400({ message: "Invalid translation language, please give a valid language!" });
    }

    // var will be the code of that language 
    const languageCode = LanguageMap[language as keyof typeof LanguageMap];

    try {
        const gameData = await ddbDocClient.send(
            new GetCommand({
                TableName: process.env.GAME_TABLE_NAME,
                Key: { userId, gameId }
            })
        );

        if (!gameData.Item) {
            return apiResponses._404({ message: `Game with ID ${gameId} not found for user ${userId}.` });
        }

        const game: Game = gameData.Item as Game;

        // if game has a translation and that translation is selected language, return it without any process
        if (game.sourceLanguage === languageCode) {
            return apiResponses._200({
                language: language,
                translated: "false",
                tableUsed: "false",
                gameId: game.gameId,
                translatedData: JSON.stringify({ title: game.title, genre: game.genre, description: game.description }),
            });
        }

        const translationCheckCommand = await ddbDocClient.send(
            new GetCommand({
                TableName: process.env.TRANSLATE_TABLE_NAME,
                Key: {
                    gameId: gameId,
                    targetLanguage: languageCode,
                },
            })
        );

        if (translationCheckCommand.Item) {
            return apiResponses._200({
                language: language,
                translated: "false",
                tableUsed: "true",
                gameId: game.gameId,
                translatedData: JSON.stringify(translationCheckCommand.Item.text)
            });
        }

        // translation order : title -> genre -> description
        const fieldsToTranslate = ["title", "genre", "description"];

        for (let field of fieldsToTranslate) {
            const translateParams: AWS.Translate.Types.TranslateTextRequest = {
                Text: game[field],
                SourceLanguageCode: game.sourceLanguage,
                TargetLanguageCode: languageCode,
            };

            const translateMessage = await translate.translateText(translateParams).promise();
            game[field] = translateMessage.TranslatedText;
        }

        const translatedItem: Translation = { gameId: game.gameId, targetLanguage: languageCode, text: JSON.stringify({ title: game.title, genre: game.genre, description: game.description }) };

        const translatedPutCommand = await ddbDocClient.send(
            new PutCommand({
                TableName: process.env.TRANSLATE_TABLE_NAME,
                Item: translatedItem
            })
        );

        // to check updated game data
        console.log("[TRANSLATE ITEM]", JSON.stringify({ stat: translatedPutCommand.$metadata.httpStatusCode, gameId: gameId, game: game }));
        return apiResponses._200({ language: language, translated: "true", tableUsed: "false", gameId: game.gameId, translatedData: translatedItem.text });

    } catch (error: any) {
        console.log('error in the translation', error);
        return apiResponses._400({ message: 'Unable to translate the message' });
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
