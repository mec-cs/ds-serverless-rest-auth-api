const apiResponses = {
    _200: (body: { [key: string]: any }) => {
        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(body, null, 2),
        };
    },
    _201: (body: { [key: string]: any }) => {
        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(body, null, 2),
        };
    },
    _400: (body: { [key: string]: any }) => {
        return {
            statusCode: 400,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(body, null, 2),
        };
    },
    _401: (body: { [key: string]: any }) => {
        return {
            statusCode: 401,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(body, null, 2),
        }
    },
    _403: (body: { [key: string]: any }) => {
        return {
            statusCode: 401,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(body, null, 2),
        }
    },
    _404: (body: { [key: string]: any }) => {
        return {
            statusCode: 401,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(body, null, 2),
        }
    },
    _500: (body: { [key: string]: any }) => {
        return {
            statusCode: 500,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(body, null, 2),
        }
    }
};

export default apiResponses;