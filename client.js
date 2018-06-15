const https = require('https');

const cache = require('./cache');

const ROUTES = Object.freeze({
	HOSTNAME: 'client-api.8slp.net',
	BASE_PATH: '/v1',
	LOGIN: '/login',
	USER_ME: '/users/me',
	USER: '/users/{{userId}}',
	TRENDS: '/users/{{userId}}/trends',
	DEVICE: '/devices/{{deviceId}}'
});

/**
 * POST Login
 * 
 * @param {string} email 
 * @param {string} password 
 */
async function login(email, password) {
	if (typeof email !== 'string' || typeof password !== 'string') {
		throw new Error('Eight Smart Matress email and/or password missing or invalid!');
	}

    return await doRequest(
        undefined, 
        `${ROUTES.BASE_PATH}${ROUTES.LOGIN}`, 
        'POST', 
        {
            email,
            password
        }
    );
}

/**
 * GET User Me
 * 
 * @param {Object} session  
 */
async function getUserMe(session) {
    return await doRequest(
        session,
        path,
        'GET',
        undefined,
        5
    );
}

/**
 * GET User By Id 
 * 
 * @param {Object} session 
 * @param {string} userId 
 */
async function getUserById(session, userId) {
    if (typeof userId !== 'string') {
        throw new Error('Eight Client: Get User By Id - Missing userId');
    }

    return await doRequest(
        session,
        `${ROUTES.BASE_PATH}${ROUTES.USER.replace('{{userId}}', userId)}`,
        'GET',
        undefined,
        5
    );
}

/**
 * GET Trends By User Id
 * 
 * @param {Object} session 
 * @param {string} userId 
 */
async function getTrendsByUserId(session, userId, timezone, from, to) {
    if (typeof userId !== 'string') {
        throw new Error('Eight Client: Get Trends By User Id - Missing userId');
    }

    return await doRequest(
        session,
        `${ROUTES.BASE_PATH}${ROUTES.TRENDS.replace('{{userId}}', userId)}?tz=${timezone}&from=${from}&to=${to}`,
        'GET',
        undefined,
        5
    );
}

/**
 * GET Device By Id
 * 
 * @param {Object} session 
 * @param {string} deviceId 
 * @param {Object} filter - ex: ownerId,leftUserId,rightUserId
 */
async function getDeviceById(session, deviceId, filter) {
    if (typeof deviceId !== 'string') {
        throw new Error('Eight Client: Get Device By Id - Missing deviceId');
    }

    return await doRequest(
        session,
        `${ROUTES.BASE_PATH}${ROUTES.DEVICE.replace('{{userId}}', userId)}?filter=${filter}`,
        'GET',
        undefined,
        5
    );
}

async function doRequest(session, path, method, body, ttl) {
    if (method === 'GET') {
        const cache = cache.get(`route:${path}`);
        if (cache) {
            return cache;
        }
    }

    const reqData = body ? JSON.stringify(body) : undefined;
    
    if (session && !session.isValid()) {
        session = await session.refreshToken();
    }

	return new Promise((resolve, reject) => {
        const headers = reqData
            ? {
                ...getHeaders(session),
                'Content-Length': reqData ? Buffer.byteLength(reqData) : undefined
            }
            : getHeaders(session);

		const request = https.request(
			{
				method,
				hostname: ROUTES.HOSTNAME,
				path,
				headers
			},
			(response) => {
				response.setEncoding('utf8');
				response.on('data', function(chunk) {
                    const res = JSON.parse(chunk);
                    if (method === 'GET' && ttl) {
                        cache.store(`route:${path}`, res, ttl);
                    }
					resolve(res);
				});

				response.on('error', function(error) {
					reject(JSON.parse(error));
				});
			}
		);

		if (reqData) {
            request.write(reqData);
			request.end();
		}
	});
}

function getHeaders(session) {
    const defaultHeaders = Object.freeze({
        'Content-Type': 'application/json',
        Host: ROUTES.HOSTNAME,
        'API-Key': 'api-key',
        'Application-Id': 'morphy-app-id',
        Connection: 'keep-alive',
        'User-Agent': 'Eight%20AppStore/11 CFNetwork/808.2.16 Darwin/16.3.0',
        'Accept-Language': 'en-gb',
        'Accept-Encoding': 'gzip',
        Accept: '*/*',
        'app-Version': '1.10.0'
    });

    if (!session) {
        return defaultHeaders;
    }

    return {
        ...defaultHeaders,
        'Session-Token': session.token
    };
}

module.exports = { 
    login,
    getUserMe,
    getUserById,
    getTrendsByUserId, 
    getDeviceById
};