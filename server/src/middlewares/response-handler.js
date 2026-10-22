const statusCodes = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    PAYLOAD_TOO_LARGE: 413,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
};

const responseHandler = () => (req, res, next) => {
    res.success = ({ statusCode, result = null, msg = null }) => {
        return res.status(statusCode).json({ result, msg });
    };

    res.clientError = ({ statusCode, error = null, msg = null }) => {
        return res.status(statusCode).json({ msg, error });
    };

    res.serverError = ({ statusCode, error = null, msg = null }) => {
        return res.status(statusCode).json({ msg, error });
    };

    res.ok = (params = {}) => {
        return res.success({ ...params, statusCode: statusCodes.OK });
    };

    res.created = (params = {}) => {
        return res.success({ ...params, statusCode: statusCodes.CREATED });
    };

    res.badRequest = (params = {}) => {
        return res.clientError({ ...params, statusCode: statusCodes.BAD_REQUEST });
    };

    res.notFound = (params = {}) => {
        return res.clientError({ ...params, statusCode: statusCodes.NOT_FOUND });
    };

    res.payloadTooLarge = (params = {}) => {
        return res.clientError({ ...params, statusCode: statusCodes.PAYLOAD_TOO_LARGE });
    };

    res.internalServerError = (params = {}) => {
        return res.serverError({ ...params, statusCode: statusCodes.INTERNAL_SERVER_ERROR });
    };

    res.serviceUnavailable = (params = {}) => {
        return res.serverError({ ...params, statusCode: statusCodes.SERVICE_UNAVAILABLE });
    };

    next();
};

export default responseHandler;
