// ======================================================
// LINES SERVICE — api.Lines.* (Phase 4 port từ base.js G.Lines)
// ======================================================
//
// Phase 20: Wrap mapApiError để throw AppError {code, message, field, status}
// → page handler (line-detail Phase 17) hiển thị đúng message backend.
//

import { api } from "@/libs/api.js";
import { mapApiError } from "@/libs/api-error.js";
import { MESSAGES } from "@/utils/messages.js";

export const linesService = {
    async getAll() {
        try {
            return (await api.get("/lines"))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    async getLineSongs(lineId) {
        try {
            return (await api.get(`/lines/${lineId}/songs`))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    async getLinePlaylists(lineId) {
        try {
            return (await api.get(`/lines/${lineId}/playlists`))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    async getLineVideos(lineId) {
        try {
            return (await api.get(`/lines/${lineId}/videos`))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    async getLineAlbums(lineId) {
        try {
            return (await api.get(`/lines/${lineId}/albums`))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },
};