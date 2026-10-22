import { errorHandlerFunction } from '../middlewares/error.js';
import responseMessages from '../middlewares/response-messages.js';
import config from '../config/config.js';
import db from '../models/index.js';
import validator from '../validators/transcripts.js';
import { formatTranscript } from '../utils/commonUtils.js';

const invalidIdError = { id: 'id must be a valid UUID' };

export default {
    create: async (req, res) => {
        try {
            const { error, validatedData } = validator.validateCreate(req.body);
            if (error) {
                return res.badRequest({ msg: responseMessages[1001], error });
            }

            const row = await db.transcripts.create(validatedData);

            return res.created({ msg: responseMessages[1003], result: formatTranscript(row) });
        } catch (error) {
            return errorHandlerFunction(res, error);
        }
    },

    list: async (req, res) => {
        try {
            const { error, validatedData } = validator.validateList(req.query);
            if (error) {
                return res.badRequest({ msg: responseMessages[1001], error });
            }

            const rows = await db.transcripts.findAll({ ...validatedData, limit: config.listLimit });

            return res.ok({ msg: responseMessages[1002], result: rows.map(formatTranscript) });
        } catch (error) {
            return errorHandlerFunction(res, error);
        }
    },

    get: async (req, res) => {
        try {
            if (!validator.isValidId(req.params.id)) {
                return res.badRequest({ msg: responseMessages[1001], error: invalidIdError });
            }

            const row = await db.transcripts.findById(req.params.id);
            if (!row) {
                return res.notFound({ msg: responseMessages[1006] });
            }

            return res.ok({ msg: responseMessages[1002], result: formatTranscript(row) });
        } catch (error) {
            return errorHandlerFunction(res, error);
        }
    },

    audio: async (req, res) => {
        try {
            if (!validator.isValidId(req.params.id)) {
                return res.badRequest({ msg: responseMessages[1001], error: invalidIdError });
            }

            const audio = await db.transcripts.findAudio(req.params.id);
            if (!audio) {
                return res.notFound({ msg: responseMessages[1013] });
            }

            res.set('Content-Type', 'audio/wav');
            return res.send(audio);
        } catch (error) {
            return errorHandlerFunction(res, error);
        }
    },

    update: async (req, res) => {
        try {
            if (!validator.isValidId(req.params.id)) {
                return res.badRequest({ msg: responseMessages[1001], error: invalidIdError });
            }

            const { error, validatedData } = validator.validateUpdate(req.body);
            if (error) {
                return res.badRequest({ msg: responseMessages[1001], error });
            }

            const row = await db.transcripts.updateText(req.params.id, validatedData.text);
            if (!row) {
                return res.notFound({ msg: responseMessages[1006] });
            }

            return res.ok({ msg: responseMessages[1004], result: formatTranscript(row) });
        } catch (error) {
            return errorHandlerFunction(res, error);
        }
    },

    delete: async (req, res) => {
        try {
            if (!validator.isValidId(req.params.id)) {
                return res.badRequest({ msg: responseMessages[1001], error: invalidIdError });
            }

            const deleted = await db.transcripts.deleteById(req.params.id);
            if (!deleted) {
                return res.notFound({ msg: responseMessages[1006] });
            }

            return res.ok({ msg: responseMessages[1005], result: { id: req.params.id } });
        } catch (error) {
            return errorHandlerFunction(res, error);
        }
    },
};
