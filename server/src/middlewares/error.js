import config from '../config/config.js';
import responseMessages from './response-messages.js';

const databaseDownCodes = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', '28P01', '3D000', '57P01', '53300'];

export const errorHandlerFunction = (res, error) => {
    console.error('error:', error.message || error.code);
    if (!config.isProduction) {
        console.error(error.stack);
    }

    const isConnectTimeout = String(error.message).includes('timeout exceeded when trying to connect');
    if (databaseDownCodes.includes(error.code) || isConnectTimeout) {
        return res.serviceUnavailable({ msg: responseMessages[1009] });
    }

    return res.internalServerError({ msg: responseMessages[1007] });
};

export const errorHandler = (error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    if (error.type === 'entity.parse.failed') {
        return res.badRequest({ msg: responseMessages[1010] });
    }

    if (error.type === 'entity.too.large') {
        return res.payloadTooLarge({ msg: responseMessages[1011] });
    }

    console.error('request failed:', req.method, req.originalUrl);
    return errorHandlerFunction(res, error);
};
