// ======================================================
// DETAILS SERVICE — api.Details.* (Phase 4 port từ base.js G.Details)
// ======================================================

import { api } from "@/libs/api.js";
import { mapApiError } from "@/libs/api-error.js";
import { MESSAGES } from "@/utils/messages.js";

export const detailsService = {
    async getPlaylist(slug) {
        try {
            return (await api.get(`/playlists/details/${slug}?limit=50`)) ?? {};
        } catch (err) {
            throw mapApiError(err, {
                defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR,
            });
        }
    },

    async getAlbum(slug) {
        try {
            return (await api.get(`/albums/details/${slug}?limit=50`)) ?? {};
        } catch (err) {
            throw mapApiError(err, {
                defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR,
            });
        }
    },

    async getSong(id) {
        try {
            return (await api.get(`/songs/details/${id}`)) ?? {};
        } catch (err) {
            throw mapApiError(err, {
                defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR,
            });
        }
    },

    async getVideo(id) {
        try {
            return (await api.get(`/videos/details/${id}`)) ?? {};
        } catch (err) {
            throw mapApiError(err, {
                defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR,
            });
        }
    },
};
