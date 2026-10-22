import config from '../config/config.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidId = (id) => UUID_PATTERN.test(id);

const checkText = (text, error) => {
    const trimmedText = typeof text === 'string' ? text.trim() : '';

    if (!trimmedText) {
        error.text = 'text is required';
    } else if (trimmedText.length > config.textMaxLength) {
        error.text = `text must be at most ${config.textMaxLength} characters`;
    }

    return trimmedText;
};

const validateCreate = (body = {}) => {
    const error = {};
    const text = checkText(body.text, error);

    const durationMs = body.durationMs;
    if (!Number.isInteger(durationMs) || durationMs < 0 || durationMs > config.maxDurationMs) {
        error.durationMs = `durationMs must be a whole number between 0 and ${config.maxDurationMs}`;
    }

    if (Object.keys(error).length) {
        return { error, validatedData: null };
    }
    return { error: '', validatedData: { text, durationMs } };
};

const validateUpdate = (body = {}) => {
    const error = {};
    const text = checkText(body.text, error);

    if (Object.keys(error).length) {
        return { error, validatedData: null };
    }
    return { error: '', validatedData: { text } };
};

const validateList = (query = {}) => {
    const error = {};
    const search = typeof query.search === 'string' ? query.search.trim() : '';
    const sort = query.sort || 'newest';
    const from = query.from || '';
    const to = query.to || '';

    if (search.length > config.searchMaxLength) {
        error.search = `search must be at most ${config.searchMaxLength} characters`;
    }
    if (sort !== 'newest' && sort !== 'oldest') {
        error.sort = 'sort must be newest or oldest';
    }
    if (from && (typeof from !== 'string' || Number.isNaN(Date.parse(from)))) {
        error.from = 'from must be a valid date';
    }
    if (to && (typeof to !== 'string' || Number.isNaN(Date.parse(to)))) {
        error.to = 'to must be a valid date';
    }
    if (from && to && !error.from && !error.to && Date.parse(from) >= Date.parse(to)) {
        error.to = 'to must be after from';
    }

    if (Object.keys(error).length) {
        return { error, validatedData: null };
    }
    return { error: '', validatedData: { search, sort, from, to } };
};

export default {
    isValidId,
    validateCreate,
    validateUpdate,
    validateList,
};
